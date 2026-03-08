# Origami RL Training Implementation Guide

This guide details how to implement a Reinforcement Learning (RL) training pipeline to train a Large Language Model (LLM) to generate `.fold` crease patterns from natural language prompts. 

The architecture uses **OpenEnv (0.2.1)** deployed on Hugging Face Spaces for the environment and reward calculation, and **Unsloth + Hugging Face TRL** in Google Colab for the training loop.

---

## 1. The OpenEnv Environment (Hugging Face Spaces)

You will deploy a FastAPI application on Hugging Face Spaces that hosts your custom `OrigamiEnv`. This environment takes a generated `.fold` JSON string, compares it to a ground-truth `.fold` file, and returns a reward.

### `requirements.txt`
```text
openenv==0.2.1
fastapi
uvicorn
numpy
networkx
```

### `app.py` (HF Space Entrypoint)
```python
import json
import numpy as np
import networkx as nx
from fastapi import FastAPI
from openenv import OpenEnv, BaseEnvironment, StepResult

app = FastAPI()

# Helper function to calculate reward (Graph Edit Distance or Edge Overlap)
def calculate_fold_reward(generated_json: str, target_json: dict) -> float:
    try:
        gen_data = json.loads(generated_json)
        
        # 1. Basic Validation Reward
        if "vertices_coords" not in gen_data or "edges_vertices" not in gen_data:
            return -1.0 # Invalid format penalty
            
        # 2. Structural Comparison (Simplified)
        # In a real scenario, you'd use Procrustes analysis to align vertices 
        # and then compute Intersection over Union (IoU) of the edges.
        # Here we do a simple edge count and assignment match ratio.
        
        gen_edges = len(gen_data.get("edges_vertices", []))
        target_edges = len(target_json.get("edges_vertices", []))
        
        # Reward based on how close the edge count is
        edge_diff_penalty = abs(gen_edges - target_edges) * 0.1
        
        # Base reward for valid JSON + penalty for structural difference
        reward = 1.0 - edge_diff_penalty
        
        return max(-1.0, min(1.0, reward)) # Clip between -1 and 1
        
    except json.JSONDecodeError:
        return -2.0 # Severe penalty for invalid JSON

class OrigamiEnv(BaseEnvironment):
    def __init__(self):
        super().__init__()
        # Load your dataset of prompts and target .fold files
        self.dataset = [
            {
                "prompt": "Make a simple diagonal fold",
                "target": {
                    "vertices_coords": [[0,0], [1,0], [1,1], [0,1]],
                    "edges_vertices": [[0,1], [1,2], [2,3], [3,0], [0,2]],
                    "edges_assignment": ["B", "B", "B", "B", "V"]
                }
            }
        ]
        self.current_idx = 0

    def reset(self) -> str:
        self.current_idx = np.random.randint(len(self.dataset))
        return self.dataset[self.current_idx]["prompt"]

    def step(self, action: str) -> StepResult:
        target = self.dataset[self.current_idx]["target"]
        
        # Calculate reward
        reward = calculate_fold_reward(action, target)
        
        # In this simple single-turn env, every step ends the episode
        done = True 
        
        return StepResult(
            observation="Episode finished.",
            reward=reward,
            done=done,
            info={"target_edges": len(target["edges_vertices"])}
        )

# Initialize OpenEnv server
env = OrigamiEnv()
openenv_app = OpenEnv(env)
app.mount("/", openenv_app.get_app())
```

---

## 2. Minimal Training Script (Google Colab)

This script uses **Unsloth** for fast, memory-efficient LoRA loading and **TRL's PPOTrainer** (Proximal Policy Optimization) to train the model against your HF Space environment.

### Setup (Run in Colab cell)
```bash
!pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps "xformers<0.0.27" "trl<0.9.0" peft accelerate bitsandbytes
!pip install openenv==0.2.1
```

### Training Script
```python
import torch
from unsloth import FastLanguageModel
from trl import PPOTrainer, PPOConfig, AutoModelForCausalLMWithValueHead
from transformers import AutoTokenizer
from openenv.client import EnvClient

# 1. Connect to your Hugging Face Space Environment
# Replace with your actual HF Space URL
env = EnvClient("https://your-username-origami-env.hf.space")

# 2. Load Model and Tokenizer using Unsloth for speed and memory efficiency
max_seq_length = 2048
model_name = "unsloth/llama-3-8b-Instruct-bnb-4bit" # Or a smaller model

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=model_name,
    max_seq_length=max_seq_length,
    dtype=None,
    load_in_4bit=True,
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

# Wrap model for PPO (adds a value head for RL)
ppo_model = AutoModelForCausalLMWithValueHead.from_pretrained(model)

# 3. Configure PPO
config = PPOConfig(
    model_name=model_name,
    learning_rate=1.41e-5,
    batch_size=4,
    mini_batch_size=1,
    gradient_accumulation_steps=4,
    optimize_cuda_cache=True,
)

ppo_trainer = PPOTrainer(
    config=config,
    model=ppo_model,
    ref_model=None, # TRL handles reference model automatically if None
    tokenizer=tokenizer,
)

# 4. RL Training Loop
epochs = 100
system_prompt = "You are an expert origami designer. Output valid FOLD JSON."

for epoch in range(epochs):
    # Get prompt from environment
    obs = env.reset()
    
    # Format input
    prompt_text = f"<|system|>\n{system_prompt}\n<|user|>\n{obs}\n<|assistant|>\n"
    inputs = tokenizer(prompt_text, return_tensors="pt").to("cuda")
    
    # Generate action (.fold JSON)
    generation_kwargs = {
        "min_length": -1,
        "top_k": 0.0,
        "top_p": 1.0,
        "do_sample": True,
        "pad_token_id": tokenizer.eos_token_id,
        "max_new_tokens": 512,
    }
    
    response_tensors = ppo_trainer.generate(
        inputs["input_ids"].squeeze(), 
        **generation_kwargs
    )
    
    # Decode response
    response_text = tokenizer.decode(response_tensors[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    
    # Step environment to get reward
    step_result = env.step(response_text)
    reward = torch.tensor([step_result.reward], dtype=torch.float).to("cuda")
    
    # PPO Update step
    stats = ppo_trainer.step(
        [inputs["input_ids"].squeeze()], 
        [response_tensors[0][inputs["input_ids"].shape[1]:]], 
        [reward[0]]
    )
    
    print(f"Epoch {epoch} | Reward: {step_result.reward:.2f} | Loss: {stats['ppo/loss/total']:.4f}")

# 5. Save the trained LoRA adapters
model.save_pretrained("origami_rl_lora")
```

## 3. Advanced Reward Calculation Notes

To make the RL agent truly learn 2D to 3D inference, your `calculate_fold_reward` function needs to be robust:

1. **Graph Isomorphism:** Convert the `vertices_coords` and `edges_vertices` into a `networkx` graph. Use graph edit distance to compare the generated graph to the target graph. This makes the reward invariant to translation, rotation, and scaling.
2. **Physics Simulation Reward:** For advanced RL, you could run a headless version of your Position-Based Dynamics (PBD) solver inside the HF Space. The reward would be calculated by simulating the fold and measuring the 3D Chamfer distance between the resulting 3D mesh and the target 3D shape.
