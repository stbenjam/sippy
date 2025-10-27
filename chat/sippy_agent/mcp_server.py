"""
MCP Server implementation for Sippy Chat.

Exposes prompts as both MCP prompts and tools through SSE transport using FastMCP.
"""

import json
import logging
from typing import Any, Dict

from fastmcp import FastMCP

from .prompts import PromptManager
from .agent import SippyAgent

logger = logging.getLogger(__name__)


class SippyMCPServer:
    """MCP server that exposes Sippy Chat prompts as tools and prompts."""

    def __init__(self, prompt_manager: PromptManager, agent: SippyAgent):
        """
        Initialize the Sippy MCP server.

        Args:
            prompt_manager: PromptManager instance to access prompts
            agent: SippyAgent instance to execute prompts
        """
        self.prompt_manager = prompt_manager
        self.agent = agent
        
        # Create FastMCP server
        self.mcp = FastMCP("sippy-chat")
        
        # Register prompts and tools dynamically
        self._register_prompts_and_tools()
        
        # Register the special ask-sippy tool
        self._register_ask_sippy_tool()

    def _register_ask_sippy_tool(self):
        """Register a special tool for asking Sippy free-form questions about CI issues."""
        
        async def ask_sippy(question: str):
            """
            Ask Sippy a question about CI/CD issues, test failures, or release health.
            
            Sippy is an expert assistant for analyzing OpenShift CI job and test failures.
            It has access to tools for analyzing jobs, tests, payloads, and incidents.
            
            Response format:
            - Text response with analysis and insights
            - May include links to jobs, tests, or incidents
            - May include visualizations in Plotly format (as JSON)
            
            Visualizations:
            When visualizations are included, they are returned as Plotly chart specifications
            with the following structure:
            {
              "data": [...],      // Array of Plotly trace objects
              "layout": {...},    // Plotly layout configuration
              "config": {...}     // Optional Plotly config
            }
            
            Common chart types returned:
            - Line charts for trends over time
            - Bar charts for comparing metrics
            - Scatter plots for correlations
            
            Args:
                question: Your question about CI/CD issues, test failures, or release health
                
            Returns:
                Analysis response with insights, links, and optional visualizations
            """
            logger.info(f"ask-sippy: {question}")
            
            # Execute through the agent
            result = await self.agent.achat(
                question,
                chat_history=None,
                thinking_callback=None
            )
            
            # Extract response text
            if isinstance(result, dict) and "output" in result:
                response_text = result["output"]
                thinking_steps = result.get("thinking_steps", [])
                
                # Build response with thinking steps if available
                if thinking_steps:
                    response = {
                        "response": response_text,
                        "thinking_steps": thinking_steps,
                        "note": "Response may contain Plotly visualizations embedded in the text"
                    }
                    return json.dumps(response, indent=2)
                else:
                    return response_text
            else:
                return str(result)
        
        # Register with FastMCP
        self.mcp.tool(
            name="ask-sippy",
            description="Ask Sippy a free-form question about CI/CD issues, test failures, or release health. Sippy can analyze jobs, tests, payloads, and provide insights with optional visualizations."
        )(ask_sippy)
        
        logger.info("Registered special tool: ask-sippy")

    def _register_prompts_and_tools(self):
        """Register all prompts as both MCP prompts and tools."""
        prompts_list = self.prompt_manager.list_prompts()
        
        for prompt_data in prompts_list:
            # Skip hidden prompts
            if prompt_data.get("hide", False):
                continue
            
            prompt_name = prompt_data["name"]
            logger.info(f"Registering prompt and tool: {prompt_name}")
            
            # Register as MCP prompt (for getting the rendered template)
            self._register_prompt(prompt_data)
            
            # Register as MCP tool (for executing the prompt through the agent)
            self._register_tool(prompt_data)
    
    def _register_prompt(self, prompt_data: Dict[str, Any]):
        """Register a single prompt as an MCP prompt."""
        prompt_name = prompt_data["name"]
        description = prompt_data.get("description", "")
        arguments = prompt_data.get("arguments", [])
        
        # Build the function signature dynamically
        # Create a function with explicit parameters based on the prompt arguments
        # Include type hints for better schema generation
        param_names = [arg["name"] for arg in arguments]
        param_parts = []
        for arg in arguments:
            arg_name = arg["name"]
            arg_type = arg.get("type", "string")
            # Add type hints
            if arg_type == "array":
                type_hint = ": list"
            elif arg_type == "number":
                type_hint = ": float"
            elif arg_type == "integer":
                type_hint = ": int"
            elif arg_type == "boolean":
                type_hint = ": bool"
            else:
                type_hint = ": str"
            param_parts.append(f"{arg_name}{type_hint}")
        params_str = ", ".join(param_parts)
        
        # Create the function code
        func_code = f"""
async def prompt_func({params_str}):
    '''Render the prompt template with arguments.'''
    args_dict = {{{", ".join(f"'{name}': {name}" for name in param_names)}}}
    rendered = prompt_manager.render(prompt_name, args_dict)
    if rendered is None:
        raise ValueError(f"Failed to render prompt '{{prompt_name}}'")
    return rendered
"""
        
        # Execute the function code to create the function
        local_vars = {
            "prompt_manager": self.prompt_manager,
            "prompt_name": prompt_name
        }
        exec(func_code, local_vars)
        prompt_func = local_vars["prompt_func"]
        
        # Set function metadata
        prompt_func.__name__ = prompt_name
        prompt_func.__doc__ = description
        
        # Register with FastMCP
        self.mcp.prompt(name=prompt_name, description=description)(prompt_func)
    
    def _register_tool(self, prompt_data: Dict[str, Any]):
        """Register a single prompt as an MCP tool that executes through the agent."""
        prompt_name = prompt_data["name"]
        tool_name = f"invoke-{prompt_name}"
        description = f"Invoke the '{prompt_name}' prompt and get agent analysis. {prompt_data.get('description', '')}"
        arguments = prompt_data.get("arguments", [])
        
        # Build the function signature dynamically with type hints
        param_names = [arg["name"] for arg in arguments]
        param_parts = []
        for arg in arguments:
            arg_name = arg["name"]
            arg_type = arg.get("type", "string")
            # Add type hints for proper schema generation
            if arg_type == "array":
                type_hint = ": list"
            elif arg_type == "number":
                type_hint = ": float"
            elif arg_type == "integer":
                type_hint = ": int"
            elif arg_type == "boolean":
                type_hint = ": bool"
            else:
                type_hint = ": str"
            param_parts.append(f"{arg_name}{type_hint}")
        params_str = ", ".join(param_parts)
        
        # Create the function code
        func_code = f"""
async def tool_func({params_str}):
    '''Render the prompt and execute it through the agent.'''
    args_dict = {{{", ".join(f"'{name}': {name}" for name in param_names)}}}
    logger.info(f"Executing tool {{tool_name}} with arguments: {{args_dict}}")
    
    # Render the prompt with arguments
    rendered_prompt = prompt_manager.render(prompt_name, args_dict)
    if rendered_prompt is None:
        raise ValueError(f"Failed to render prompt '{{prompt_name}}'")
    
    # Execute through the agent
    result = await agent.achat(
        rendered_prompt,
        chat_history=None,
        thinking_callback=None
    )
    
    # Extract response text
    if isinstance(result, dict) and "output" in result:
        response_text = result["output"]
        thinking_steps = result.get("thinking_steps", [])
        
        # Build response with thinking steps if available
        if thinking_steps:
            response = {{
                "response": response_text,
                "thinking_steps": thinking_steps
            }}
            return json.dumps(response, indent=2)
        else:
            return response_text
    else:
        return str(result)
"""
        
        # Execute the function code to create the function
        local_vars = {
            "prompt_manager": self.prompt_manager,
            "prompt_name": prompt_name,
            "tool_name": tool_name,
            "agent": self.agent,
            "logger": logger,
            "json": json
        }
        exec(func_code, local_vars)
        tool_func = local_vars["tool_func"]
        
        # Set function metadata
        tool_func.__name__ = tool_name
        tool_func.__doc__ = description
        
        # Register with FastMCP
        self.mcp.tool(name=tool_name, description=description)(tool_func)
    
    def get_asgi_app(self):
        """
        Get the FastMCP ASGI application for mounting in FastAPI.
        
        Returns:
            ASGI application from FastMCP
        """
        # Use the direct SSE app creation to control the endpoint paths
        from fastmcp.server.http import create_sse_app
        
        # Create SSE app with /sse and /messages as the endpoint paths
        # When mounted at /mcp, these become /mcp/sse and /mcp/messages
        return create_sse_app(
            self.mcp,  # Pass the FastMCP object, not the internal _mcp_server
            message_path="/messages",
            sse_path="/sse"
        )
