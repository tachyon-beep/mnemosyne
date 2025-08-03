#!/usr/bin/env python3
"""Agent runner for MCP Persistence System development"""

import json
import sys
import os

def load_agent(agent_name):
    """Load agent configuration"""
    agent_file = os.path.join(os.path.dirname(__file__), 'agents', f'{agent_name}.json')
    if not os.path.exists(agent_file):
        print(f"Error: Agent '{agent_name}' not found")
        print("Available agents:")
        agents_dir = os.path.join(os.path.dirname(__file__), 'agents')
        for f in os.listdir(agents_dir):
            if f.endswith('.json'):
                print(f"  - {f[:-5]}")
        sys.exit(1)
    
    with open(agent_file, 'r') as f:
        return json.load(f)

def format_prompt(agent_config, task):
    """Format the prompt for the agent"""
    template_file = os.path.join(os.path.dirname(__file__), 'agents', 'prompt_template.txt')
    with open(template_file, 'r') as f:
        template = f.read()
    
    expertise = '\n'.join(f"- {item}" for item in agent_config['expertise'])
    guidelines = '\n'.join(f"- {item}" for item in agent_config['guidelines'])
    
    prompt = template.format(
        description=agent_config['description'],
        expertise=expertise,
        guidelines=guidelines
    )
    
    return prompt + task

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python run_agent.py <agent_name> <task>")
        sys.exit(1)
    
    agent_name = sys.argv[1]
    task = ' '.join(sys.argv[2:])
    
    agent_config = load_agent(agent_name)
    prompt = format_prompt(agent_config, task)
    
    print("Agent Prompt:")
    print("=" * 80)
    print(prompt)
    print("=" * 80)
