from openai import OpenAI
from typing import List
from transformers import AutoTokenizer
import re
from huggingface_hub import login

class Agent:
    def __init__(self, model, base_url, api_key):
        self.client = OpenAI(base_url=base_url, api_key=api_key)
        self.model = model
    
    def generate(self, prompt: List[str], **kwargs):
        default_kwargs = {
            'temperature': 0.7,
            'max_tokens': 2048,
            'top_p': 0.95
        }

        for k, v in kwargs.items():
            if k in default_kwargs:
                default_kwargs[k] = v

        responses = []

        if self.model.startswith('gpt'):
            for p in prompt:
                resp = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {'role': 'user', 'content': p}
                    ],
                    temperature=default_kwargs['temperature'],
                    top_p=default_kwargs['top_p'],
                )
                responses.append(resp.choices[0].message.content)  # type: ignore
        else:
            resps = self.client.completions.create(
                model=self.model,
                prompt=prompt,
                temperature=default_kwargs['temperature'],
                max_tokens=default_kwargs['max_tokens'],
                top_p=default_kwargs['top_p'],
            )
            responses = [resp.text for resp in resps.choices]
        return responses


class ObligationAgent(Agent):
    def __init__(self, model, base_url, api_key):
        super().__init__(model, base_url, api_key)

    def __call__(self, segment: str):
        template = (
        "You will be provided with a segment from a regulatory document. "
        "Your task is to extract all structured regulations and obligations from the text. "
        "For each identified regulation, include the following fields: "
        "\"original text\" (the exact excerpt from which the regulation is derived), "
        "\"regulation\" (a clear and structured version of the regulation), and "
        "\"keyword\" (a representative term from the regulation, useful for generating follow-up questions. The keyword must appear in the extracted regulation). "
        "Respond in JSONL format, with each line following this structure: "
        "{\"original text\": \"...\", \"regulation\": \"...\", \"keyword\": \"...\"}."
        f"\n\nThe segment is as follows: {segment}"
        )
        result = self.generate([template])
        return result[0]


class QuestionAgent(Agent):
    def __init__(self, model, base_url, api_key):
        super().__init__(model, base_url, api_key)
        if model.startswith('gpt'):
            self.tokenizer = None
        else:
            self.tokenizer = AutoTokenizer.from_pretrained(model)

    def __call__(self, regulations: List[str]):
        template = (
        "Given a single regulation or obligation, generate a meaningful question that tests the user's understanding or knowledge of the regulation to promote compliance. The user would not see the regulation, so the question should be self-contained and in an open-ended format."
        "Also provide the corresponding answer. Make sure the question can be answered directly from the regulation, i.e., the answer should appear in the question."
        "Enclose the question in <question>...</question> tags and the answer in <answer>...</answer> tags.\n"
        "Here is your data:\n{}"
        )
        if self.tokenizer is not None:
            inputs = [[{'role': 'user', 'content': template.format(regulation)}] for regulation in regulations]
            inputs = [self.tokenizer.apply_chat_template(input, tokenize=False, add_generation_prompt=True) for input in inputs]
        else:
            inputs = [template.format(regulation) for regulation in regulations]
        
        valid_questions, valid_answers = False, False
        while not valid_questions or not valid_answers:
            outputs = self.generate(inputs)
            try:
                questions = [re.search('<question>(.*?)</question>', output, re.DOTALL).group(1) for output in outputs]
                answers = [re.search('<answer>(.*?)</answer>', output, re.DOTALL).group(1) for output in outputs]
                valid_questions, valid_answers = True, True
            except Exception as e:
                valid_questions, valid_answers = False, False
        
        results = [{'question': q, 'answer': a} for q, a in zip(questions, answers)]

        return results



class EvaluationAgent(Agent):
    def __init__(self, model, base_url, api_key):
        super().__init__(model, base_url, api_key)
        if model.startswith('gpt'):
            self.tokenizer = None
        else:
            self.tokenizer = AutoTokenizer.from_pretrained(model)
    
    def __call__(self, questions: List[str], gold_answers: List[str], user_answers: List[str]):
        
        template = (
        "You will be provided with a question, a gold answer, and a user answer. "
        "Your task is to evaluate whether the user answer is correct or not."
        "Enclose the judgement (correct or incorrect and your explanation) in <judgement>...</judgement> tags.\n"
        "Here is your data:\nQuestion: {}\nGold Answer: {}\nUser Answer: {}"
    )


        if self.tokenizer is not None:
            inputs = [[{'role': 'user', 'content': template.format(q, ga, ua)}] 
                  for q, ga, ua in zip(questions, gold_answers, user_answers)]
            inputs = [self.tokenizer.apply_chat_template(input, tokenize=False, add_generation_prompt=True) for input in inputs]
        
        else:
            inputs = [template.format(q, ga, ua) for q, ga, ua in zip(questions, gold_answers, user_answers)]

        valid_judgements = False
        while not valid_judgements:
            outputs = self.generate(inputs)
            try:
                judgements = [re.search('<judgement>(.*?)</judgement>', output, re.DOTALL).group(1) for output in outputs]
                valid_judgements = True
            except Exception as e:
                valid_judgements = False
        
        return judgements
        
        
        










