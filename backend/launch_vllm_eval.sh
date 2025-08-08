# Read config.json
export CUDA_VISIBLE_DEVICES=0
config_file=$(cat config.json)
evaluation_model=$(echo "$config_file" | jq -r '.evaluation_model')
evaluation_port=$(echo "$config_file" | jq -r '.evaluation_port')

vllm serve "$evaluation_model" --port "$evaluation_port" --max_model_len 40000
