#!/bin/bash

# Configuration

api_key=''
obligation_model="gpt-4o-mini"
question_model="meta-llama/Llama-3.1-8B-Instruct"
evaluation_model="meta-llama/Llama-3.1-8B-Instruct"
question_port=7808
evaluation_port=7808


cat > config.json << EOF
{
  "api_key": "$api_key",
  "obligation_model": "$obligation_model",
  "question_model": "$question_model", 
  "evaluation_model": "$evaluation_model",
  "question_port": "$question_port",
  "evaluation_port": "$evaluation_port"
}
EOF

# Launch FastAPI backend
echo "Starting FastAPI backend..."
uvicorn regulation_backend_api:app --reload --host 0.0.0.0 --port 8000