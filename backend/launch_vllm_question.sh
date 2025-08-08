# Read config.json
export CUDA_VISIBLE_DEVICES=1
config_file=$(cat config.json)
question_model=$(echo "$config_file" | jq -r '.question_model')
question_port=$(echo "$config_file" | jq -r '.question_port')

vllm serve "$question_model" --port "$question_port" --max_model_len 40000
