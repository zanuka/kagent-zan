import subprocess
from autogen_core.tools import FunctionTool
from autogen_agentchat.agents import AssistantAgent


def _verify_install() -> str:
    return _run_istioctl_command("verify-install")


verify_install = FunctionTool(
    _verify_install,
    description="Verify Istio installation status",
    name="verify_install",
)


# Function that runs the istioctl command in the shell
def _run_istioctl_command(command: str) -> str:
    """Run the given istioctl command and return the output."""
    try:
        output = subprocess.check_output(
            ["istioctl", command], stderr=subprocess.STDOUT
        )
        return output.decode("utf-8")
    except subprocess.CalledProcessError as e:
        return f"Error running istioctl command: {e.output.decode('utf-8')}"
    except FileNotFoundError:
        return "Error running istioctl command: istioctl not found in PATH"
