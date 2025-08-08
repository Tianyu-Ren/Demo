# How to Use This Prototype System

## Step 1: Upload a Regulatory Document  
Upload the regulatory document you want to process. Currently, only **PDF format** is supported.

> **Note:** There is no restriction on document length, as the system processes documents **page by page** in subsequent steps.

---

## Step 2: Select Pages for Obligation Extraction  
Choose the page range from which you want to extract obligations.

- Only **GPT-series models** are currently supported for this step (as obligation extraction is not the main focus of the *QA for Testing* project).  
- We recommend selecting a **small page range** (e.g., 5–10 pages) to avoid exceeding context limits.  
- Ensure the selected range does **not exceed the total number of pages** in the uploaded document; otherwise, an error will occur.

---

## Step 3: Generate Questions from Extracted Obligations  
Once obligations have been extracted, the system generates questions based on them.

- One question is generated **per obligation**.
- Corresponding **gold answers** are also generated but are **hidden in the UI** to prevent users from viewing them beforehand.

### Supported Model Families for Question Generation:
- **GPT-series** – May consume your API quota.
- **LLAMA-series** – A fine-tuned LLAMA-8B model that runs locally (requires **at least 10GB of GPU memory**).

---

## Step 4: Start Answering Questions  
Users can now begin answering the generated questions.

- You can answer all questions in one session or **pause and resume later**.

---

## Step 5: Evaluate Answers  
After submitting at least one answer, click **Start Marking** to begin evaluation.

### Supported Model Families for Evaluation:
- **GPT-series** – May consume your API quota.
- **LLAMA-series** – A fine-tuned LLAMA-8B model that runs locally (requires **at least 10GB of GPU memory**).