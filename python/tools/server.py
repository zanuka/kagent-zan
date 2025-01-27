# This is a script which allows you to access the tools from the k8s and istio packages
from typing import Optional

from autogen_core import CancellationToken
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from tools.istio import proxy_config, verify_install
from tools.k8s import apply_manifest, get_pod, get_pod_logs, get_pods, get_resources, get_services

app = FastAPI(title="Kubernetes & Istio Tools API")

# Request models for Kubernetes endpoints
class GetPodsRequest(BaseModel):
    ns: Optional[str] = None
    all_namespaces: Optional[bool] = None
    output: Optional[str] = "wide"

class GetPodRequest(BaseModel):
    pod_name: str
    ns: Optional[str] = None
    output: Optional[str] = "wide"

class GetServicesRequest(BaseModel):
    service_name: Optional[str] = None
    all_namespaces: Optional[bool] = None
    ns: Optional[str] = None
    output: Optional[str] = "wide"

class GetResourcesRequest(BaseModel):
    name: str
    resource_type: str
    all_namespaces: Optional[bool] = None
    ns: Optional[str] = None
    output: Optional[str] = "wide"

class ApplyManifestRequest(BaseModel):
    manifest: str

class GetPodLogsRequest(BaseModel):
    pod_name: str
    ns: str

# Request model for Istio endpoints
class ProxyConfigRequest(BaseModel):
    pod_name: str
    ns: Optional[str] = None

# Kubernetes routes
@app.post("/k8s/get_pods")
async def api_get_pods(request: GetPodsRequest):
    try:
        return {"result": await get_pods.run_json(
            {
                "ns": request.ns,
                "all_namespaces": request.all_namespaces,
                "output": request.output
            },
            CancellationToken()
        )}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/k8s/get_pod")
async def api_get_pod(request: GetPodRequest):
    try:
        return {"result": await get_pod.run_json(
            {
                "pod_name": request.pod_name,
                "ns": request.ns,
                "output": request.output
            },
            CancellationToken()
        )}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/k8s/get_services")
async def api_get_services(request: GetServicesRequest):
    try:
        return {"result": await get_services.run_json(
            {
                "service_name": request.service_name,
                "all_namespaces": request.all_namespaces,
                "ns": request.ns,
                "output": request.output
            },
            CancellationToken()
        )}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/k8s/get_resources")
async def api_get_resources(request: GetResourcesRequest):
    try:
        return {"result": await get_resources.run_json(
            {
                "name": request.name,
                "resource_type": request.resource_type,
                "all_namespaces": request.all_namespaces,
                "ns": request.ns,
                "output": request.output
            },
            CancellationToken()
        )}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/k8s/apply_manifest")
async def api_apply_manifest(request: ApplyManifestRequest):
    try:
        return {"result": await apply_manifest.run_json(
            {"manifest": request.manifest},
            CancellationToken()
        )}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/k8s/get_pod_logs")
async def api_get_pod_logs(request: GetPodLogsRequest):
    try:
        return {"result": await get_pod_logs.run_json(
            {
                "pod_name": request.pod_name,
                "ns": request.ns
            },
            CancellationToken()
        )}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

# Istio routes
@app.post("/istio/verify_install")
async def api_verify_install():
    try:
        return {"result": await verify_install.run_json({}, CancellationToken())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/istio/proxy_config")
async def api_proxy_config(request: ProxyConfigRequest):
    try:
        return {"result": await proxy_config.run_json(
            {
                "pod_name": request.pod_name,
                "ns": request.ns
            },
            CancellationToken()
        )}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
