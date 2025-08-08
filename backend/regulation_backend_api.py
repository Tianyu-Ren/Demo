from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import time
import os
from preprcessing import PDF
from agents import ObligationAgent, QuestionAgent, EvaluationAgent
import json
import uuid
from fastapi.staticfiles import StaticFiles
from dataclasses import dataclass
import json


@dataclass
class Config:
    api_key: str
    obligation_model: str
    question_model: str
    evaluation_model: str
    question_port: str
    evaluation_port: str

config_file = json.load(open("config.json"))
args = Config(**config_file)


obligation_agent = ObligationAgent(model=args.obligation_model, base_url='https://api.openai.com/v1', api_key=args.api_key)
if args.question_model.startswith("gpt"):
    question_agent = QuestionAgent(model=args.question_model, base_url='https://api.openai.com/v1', api_key=args.api_key)
else:
    question_agent = QuestionAgent(model=args.question_model, base_url=f'http://localhost:{args.question_port}/v1', api_key=args.api_key)

if args.evaluation_model.startswith("gpt"):
    evaluation_agent = EvaluationAgent(model=args.evaluation_model, base_url='https://api.openai.com/v1', api_key=args.api_key)
else:
    evaluation_agent = EvaluationAgent(model=args.evaluation_model, base_url=f'http://localhost:{args.evaluation_port}/v1', api_key=args.api_key)


app = FastAPI()
app.mount("/answers", StaticFiles(directory="answers"), name="answers")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in production, specify exact origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Regulation(BaseModel):
    original: str
    regulation: str
    keyword: str


class ExtractRequest(BaseModel):
    start_page: int
    end_page: int
    document_name: str  # name/id from upload


class QuestionGenerationRequest(BaseModel):
    regulations: List[Regulation]


class UserAnswer(BaseModel):
    session_id: str
    question: str
    answer: str
    index: int  # ✅ 新增字段


class SessionInitRequest(BaseModel):
    document_name: str
    start_page: int
    end_page: int
    regulations: List[Regulation]
    questions: List[str]

@app.post("/upload")
def upload_file(file: UploadFile = File(...)):
    # You can save the file if needed
    filename = file.filename
    contents = file.file.read()
    with open(f"./documents/{filename}", "wb") as f:
        f.write(contents)
    return {"filename": filename, "message": "File uploaded successfully."}


@app.post("/extract", response_model=List[Regulation])
def extract_regulations(request: ExtractRequest):
    file_path = f"./documents/{request.document_name}"
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"{file_path} not found.")

    # convert to text
    pdf = PDF(file_path)

    start_page = request.start_page
    end_page = request.end_page


    document_segment = pdf.ocr_pages(start_page, end_page)

    success = False
    results = []
    while not success:
        try:
            raw_obligations = obligation_agent(document_segment)
            if '```jsonl' in raw_obligations:
                raw_obligations = raw_obligations.replace('```jsonl\n', '').replace('\n```', '')
            raw_obligations = raw_obligations.replace('\n\n', '\n')
            results = [json.loads(line) for line in raw_obligations.strip().split('\n')]
            success = True
        except Exception as e:
            print(e)
            success = False
            # # Print the results in a nicely formatted way
            # print(json.dumps(results, indent=4))
    output = [Regulation(original=r.get('original text'),
                        regulation=r.get('regulation'),
                        keyword=r.get('keyword'))
            for r in results]
    return output


@app.post("/generate_questions")
def generate_questions(request: QuestionGenerationRequest):
    regulations = [item.regulation for item in request.regulations]
    questions = question_agent(regulations=regulations)
    os.makedirs("./gold_answers", exist_ok=True)
    filepath = "./gold_answers/question_answers.json"
    with open(filepath, "w") as f:
        json.dump(questions, f, indent=2)
    return [q['question'] for q in questions]


@app.post("/submit_answer")
def submit_answer(answer: UserAnswer):
    # 保存答案
    os.makedirs("./answers", exist_ok=True)
    filepath = f"./answers/{answer.session_id}.json"
    data = []
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
    data.append({"question": answer.question, "answer": answer.answer})
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

    # ✅ 同步更新 session 文件，记录 index
    session_path = f"./sessions/{answer.session_id}.json"
    if os.path.exists(session_path):
        with open(session_path, "r") as f:
            session = json.load(f)
        session["current_index"] = answer.index + 1  # ✅ 下一题
        with open(session_path, "w") as f:
            json.dump(session, f, indent=2)

    return {"message": "Answer saved."}


@app.post("/start_session")
def start_session(session: SessionInitRequest):
    os.makedirs("./sessions", exist_ok=True)
    session_id = str(uuid.uuid4())
    path = f"./sessions/{session_id}.json"
    with open(path, "w") as f:
        json.dump(session.dict(), f, indent=2)
    return {"session_id": session_id, "message": "Session started."}


@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    path = f"./sessions/{session_id}.json"
    if not os.path.exists(path):
        return {"error": "Session not found"}
    with open(path, "r") as f:
        session_data = json.load(f)
    return session_data


@app.post("/evaluate_answers")
def evaluate_answers(request: dict):
    session_id = request.get("session_id")
    if not session_id:
        return {"error": "Missing session_id"}

    # Load user answers
    user_answer_path = f"./answers/{session_id}.json"
    if not os.path.exists(user_answer_path):
        return {"error": "User answers not found"}
    with open(user_answer_path, "r") as f:
        user_answers = json.load(f)

    # Load gold answers
    gold_answer_path = "./gold_answers/question_answers.json"
    if not os.path.exists(gold_answer_path):
        return {"error": "Gold answers not found"}
    with open(gold_answer_path, "r") as f:
        gold_answers = json.load(f)

    # Evaluate answers
    input_questions = []
    input_gold_answers = []
    input_user_answers = []

    for user in user_answers:
        question = user.get("question")
        your_answer = user.get("answer")

        # 找到匹配的 gold answer
        gold_entry = next((item for item in gold_answers if item["question"] == question), None)
        gold_answer = gold_entry["answer"] if gold_entry else "N/A"

        input_questions.append(question)
        input_gold_answers.append(gold_answer)
        input_user_answers.append(your_answer)

    judgments = evaluation_agent(input_questions, input_gold_answers, input_user_answers)

    returns = []

    for q, ga, ua, j in zip(input_questions, input_gold_answers, input_user_answers, judgments):
        returns.append({"question": q, "gold_answer": ga, "your_answer": ua, "judgment": j})

    return returns


    # uvicorn regulation_backend_api:app --reload