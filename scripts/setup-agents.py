#!/usr/bin/env python3
"""
Setup script to create agent configurations for the MCP Persistence System.
These agents can be invoked using the Task tool to handle specialized development tasks.
"""

import json
import os

# Define agent configurations
agents = {
    "mcp-implementation": {
        "description": "Implement core MCP server functionality and protocol compliance",
        "expertise": [
            "MCP protocol implementation",
            "JSON-RPC 2.0 message handling",
            "stdio transport setup",
            "Tool registration systems",
            "Protocol initialization and capability negotiation"
        ],
        "guidelines": [
            "Follow MCP SDK documentation strictly",
            "Ensure all tools are stateless",
            "Implement proper error handling for protocol messages",
            "Use TypeScript with strict type checking",
            "Reference HLD.md for architectural decisions"
        ]
    },
    
    "database-architect": {
        "description": "Design and implement SQLite database schema and operations",
        "expertise": [
            "SQLite database design",
            "Schema migrations",
            "Query optimization",
            "Transaction management",
            "Database performance tuning"
        ],
        "guidelines": [
            "Use exact schema from HLD.md",
            "Enable WAL mode for concurrency",
            "Implement atomic transactions for all write operations",
            "Create indexes for common query patterns",
            "Use better-sqlite3 synchronous API"
        ]
    },
    
    "tool-implementer": {
        "description": "Implement individual MCP tools according to specifications",
        "expertise": [
            "MCP tool implementation",
            "Zod schema validation",
            "Error handling patterns",
            "Response formatting",
            "Stateless design patterns"
        ],
        "guidelines": [
            "Each tool must complete in single request/response",
            "Use Zod for all input validation",
            "Follow standard response format from HLD.md",
            "Implement comprehensive error handling",
            "Never expose internal errors to users"
        ]
    },
    
    "search-optimizer": {
        "description": "Implement and optimize search functionality with SQLite FTS5",
        "expertise": [
            "SQLite FTS5 configuration",
            "Full-text search optimization",
            "Query parsing and sanitization",
            "Search result ranking",
            "Snippet generation"
        ],
        "guidelines": [
            "Configure FTS5 for conversation search",
            "Implement proper query sanitization",
            "Add BM25 ranking for relevance",
            "Generate contextual snippets",
            "Handle special characters in queries"
        ]
    },
    
    "test-engineer": {
        "description": "Create comprehensive test suite for all components",
        "expertise": [
            "Jest testing framework",
            "Unit test design",
            "Integration testing",
            "Mock strategies",
            "Test coverage analysis"
        ],
        "guidelines": [
            "Aim for >80% code coverage",
            "Test both success and error paths",
            "Create integration tests for MCP protocol",
            "Use in-memory SQLite for test isolation",
            "Test concurrent operations"
        ]
    }
}

# Create agents directory
agents_dir = os.path.join(os.path.dirname(__file__), 'agents')
os.makedirs(agents_dir, exist_ok=True)

# Write individual agent files
for agent_name, config in agents.items():
    agent_file = os.path.join(agents_dir, f"{agent_name}.json")
    with open(agent_file, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"Created agent configuration: {agent_file}")

# Create a master prompt template
prompt_template = """You are a specialized agent for the MCP Persistence System project.

Agent Role: {description}

Your Areas of Expertise:
{expertise}

Guidelines to Follow:
{guidelines}

Current Working Directory: /home/john/mnemosyne
Project Type: TypeScript/Node.js MCP Server
Key Reference: HLD.md contains the complete system design

Please help with the following task:
"""

# Write prompt template
template_file = os.path.join(agents_dir, "prompt_template.txt")
with open(template_file, 'w') as f:
    f.write(prompt_template)
print(f"\nCreated prompt template: {template_file}")

# Create agent runner script
runner_script = '''#!/usr/bin/env python3
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
    
    expertise = '\\n'.join(f"- {item}" for item in agent_config['expertise'])
    guidelines = '\\n'.join(f"- {item}" for item in agent_config['guidelines'])
    
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
'''

runner_file = os.path.join(os.path.dirname(__file__), "run_agent.py")
with open(runner_file, 'w') as f:
    f.write(runner_script)
os.chmod(runner_file, 0o755)
print(f"\nCreated agent runner: {runner_file}")

print("\nAgent setup complete!")
print("\nTo use an agent:")
print("  python scripts/run_agent.py <agent-name> <task>")
print("\nExample:")
print('  python scripts/run_agent.py mcp-implementation "Set up the base MCP server class"')