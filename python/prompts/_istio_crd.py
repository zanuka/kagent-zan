import json

from .base import PromptSection, PromptTemplate, TemplateVariable
from .models import CrdExample, IstioCrdType

AUTHORIZATION_POLICY_EXAMPLES: list[CrdExample] = [
    CrdExample(
        query="Deny requests from dev namespace to POST method on all workloads in the foo namespace",
        response=json.dumps(
            {
                "apiVersion": "security.istio.io/v1",
                "kind": "AuthorizationPolicy",
                "metadata": {"name": "deny-dev-post", "namespace": "foo"},
                "spec": {
                    "action": "DENY",
                    "rules": [
                        {
                            "from": [{"source": {"namespaces": ["dev"]}}],
                            "to": [{"operation": {"methods": ["POST"]}}],
                        }
                    ],
                },
            }
        ),
    ),
    CrdExample(
        query="Create a deny policy to deny all requests with POST method on port 8080 on all workloads in the foo namespace",
        response=json.dumps(
            {
                "apiVersion": "security.istio.io/v1",
                "kind": "AuthorizationPolicy",
                "metadata": {"name": "deny-post-8080", "namespace": "foo"},
                "spec": {
                    "action": "DENY",
                    "rules": [
                        {
                            "to": [
                                {"operation": {"methods": ["POST"], "ports": ["8080"]}}
                            ]
                        }
                    ],
                },
            }
        ),
    ),
    CrdExample(
        query="Audit any GET requests to the path with the prefix /user/profile",
        response=json.dumps(
            {
                "apiVersion": "security.istio.io/v1",
                "kind": "AuthorizationPolicy",
                "metadata": {"name": "audit-user-profile", "namespace": "ns1"},
                "spec": {
                    "selector": {"matchLabels": {"app": "myapi"}},
                    "action": "AUDIT",
                    "rules": [
                        {
                            "to": [
                                {
                                    "operation": {
                                        "methods": ["GET"],
                                        "paths": ["/user/profile/*"],
                                    }
                                }
                            ]
                        }
                    ],
                },
            }
        ),
    ),
    CrdExample(
        query="Deny all requests to workloads in namespace foo",
        response=json.dumps(
            {
                "apiVersion": "security.istio.io/v1",
                "kind": "AuthorizationPolicy",
                "metadata": {"name": "deny-all", "namespace": "foo"},
                "spec": {},
            }
        ),
    ),
    CrdExample(
        query="Allow all requests to workloads in namespace foo",
        response=json.dumps(
            {
                "apiVersion": "security.istio.io/v1",
                "kind": "AuthorizationPolicy",
                "metadata": {"name": "allow-all", "namespace": "foo"},
                "spec": {"rules": [{}]},
            }
        ),
    ),
    CrdExample(
        query='Allow requests to workloads labeled with app=customers in the customers namespace if the request is from the service account cluster.local/ns/orders/orders or from the payments namespace, and the request header "foo" has the value "bar" or the request header "user" has the value "peterj".',
        response=json.dumps(
            {
                "apiVersion": "security.istio.io/v1",
                "kind": "AuthorizationPolicy",
                "metadata": {"name": "allow-customers", "namespace": "customers"},
                "spec": {
                    "action": "ALLOW",
                    "selector": {"matchLabels": {"app": "customers"}},
                    "rules": [
                        {
                            "from": [
                                {
                                    "source": {
                                        "principals": [
                                            "cluster.local/ns/orders/sa/orders"
                                        ]
                                    }
                                },
                                {"source": {"namespaces": ["payments"]}},
                            ],
                            "to": [
                                {
                                    "operation": {
                                        "when": [
                                            {
                                                "key": "request.headers[foo]",
                                                "values": ["bar"],
                                            },
                                            {
                                                "key": "request.headers[user]",
                                                "values": ["peterj"],
                                            },
                                        ]
                                    }
                                }
                            ],
                        }
                    ],
                },
            }
        ),
    ),
    CrdExample(
        query="Allow IP address 1.2.3.4 and IPs from block 5.6.7.0/24 to access the apps labeled with app=payments.",
        response=json.dumps(
            {
                "apiVersion": "security.istio.io/v1",
                "kind": "AuthorizationPolicy",
                "metadata": {"name": "ingress-policy", "namespace": "foo"},
                "spec": {
                    "selector": {"matchLabels": {"app": "payments"}},
                    "action": "ALLOW",
                    "rules": [
                        {"from": [{"source": {"ipBlocks": ["1.2.3.4", "5.6.7.0/24"]}}]}
                    ],
                },
            }
        ),
    ),
    CrdExample(
        query="Apply the policy to all workloads in the foo namespace and allows GET requests to prefix /info or POST requests to /data for workloads using cluster.local/ns/default/sleep service account or workloads in test namespace when the issuer claim is set to https://accounts.google.common",
        response=json.dumps(
            {
                "apiVersion": "security.istio.io/v1",
                "kind": "AuthorizationPolicy",
                "metadata": {"name": "allow-info-data", "namespace": "foo"},
                "spec": {
                    "action": "ALLOW",
                    "rules": [
                        {
                            "from": [
                                {
                                    "source": {
                                        "principals": [
                                            "cluster.local/ns/default/sa/sleep"
                                        ]
                                    }
                                },
                                {"source": {"namespaces": ["test"]}},
                            ],
                            "to": [
                                {
                                    "operation": {
                                        "methods": ["GET"],
                                        "paths": ["/info*"],
                                    }
                                },
                                {
                                    "operation": {
                                        "methods": ["POST"],
                                        "paths": ["/data"],
                                    }
                                },
                            ],
                            "when": [
                                {
                                    "key": "request.auth.claims[iss]",
                                    "values": ["https://accounts.google.com"],
                                }
                            ],
                        }
                    ],
                },
            }
        ),
    ),
]

AUTHORIZATION_POLICY_PROTO = """
// WorkloadSelector specifies the criteria used to determine if a policy can be applied
// to a proxy. The matching criteria includes the metadata associated with a proxy,
// workload instance info such as labels attached to the pod/VM, or any other info
// that the proxy provides to Istio during the initial handshake. If multiple conditions are
// specified, all conditions need to match in order for the workload instance to be
// selected. Currently, only label based selection mechanism is supported.
message WorkloadSelector {
  // One or more labels that indicate a specific set of pods/VMs
  // on which a policy should be applied. The scope of label search is restricted to
  // the configuration namespace in which the resource is present.
  map<string, string> match_labels = 1;
}

// PortSelector is the criteria for specifying if a policy can be applied to 
// a listener having a specific port.
message PortSelector {
  // Port number
  uint32 number = 1  [(google.api.field_behavior) = REQUIRED];
}

// WorkloadMode allows selection of the role of the underlying workload in
// network traffic. A workload is considered as acting as a SERVER if it is
// the destination of the traffic (that is, traffic direction, from the
// perspective of the workload is *inbound*). If the workload is the source of
// the network traffic, it is considered to be in CLIENT mode (traffic is
// *outbound* from the workload).
enum WorkloadMode {
  // Default value, which will be interpreted by its own usage.
  UNDEFINED = 0;

  // Selects for scenarios when the workload is the
  // source of the network traffic. In addition, 
  // if the workload is a gateway, selects this.
  CLIENT = 1;

  // Selects for scenarios when the workload is the
  // destination of the network traffic.
  SERVER = 2;

  // Selects for scenarios when the workload is either the
  // source or destination of the network traffic.
  CLIENT_AND_SERVER = 3;
}

// PolicyTargetReference format as defined by [GEP-2648](https://gateway-api.sigs.k8s.io/geps/gep-2648/#direct-policy-design-rules).
//
// PolicyTargetReference specifies the targeted resource which the policy
// should be applied to. It must only target a single resource at a time, but it
// can be used to target larger resources such as Gateways that may apply to
// multiple child resources. The PolicyTargetReference will be used instead of
// a WorkloadSelector in the RequestAuthentication, AuthorizationPolicy,
// Telemetry, and WasmPlugin CRDs to target a Kubernetes Gateway.

message PolicyTargetReference {
  // group is the group of the target resource.
  string group = 1;

  // kind is kind of the target resource.
  string kind = 2 [(google.api.field_behavior) = REQUIRED];

  // name is the name of the target resource.
  // +kubebuilder:validation:MinLength=1
  // +kubebuilder:validation:MaxLength=253
  string name = 3 [(google.api.field_behavior) = REQUIRED];

  // namespace is the namespace of the referent. When unspecified, the local
  // namespace is inferred.
  // +kubebuilder:validation:XValidation:message="cross namespace referencing is not currently supported",rule="self.size() == 0"
  string namespace = 4;
}


// Istio Authorization Policy enables access control on workloads in the mesh.
//
// Authorization policy supports CUSTOM, DENY and ALLOW actions for access control. When CUSTOM, DENY and ALLOW actions
// are used for a workload at the same time, the CUSTOM action is evaluated first, then the DENY action, and finally the ALLOW action.
// The evaluation is determined by the following rules:
//
// 1. If there are any CUSTOM policies that match the request, evaluate and deny the request if the evaluation result is deny.
// 2. If there are any DENY policies that match the request, deny the request.
// 3. If there are no ALLOW policies for the workload, allow the request.
// 4. If any of the ALLOW policies match the request, allow the request.
// 5. Deny the request.
//
// Istio Authorization Policy also supports the AUDIT action to decide whether to log requests.
// AUDIT policies do not affect whether requests are allowed or denied to the workload.
// Requests will be allowed or denied based solely on CUSTOM, DENY and ALLOW actions.

package istio.security.v1beta1;

option go_package="istio.io/api/security/v1beta1";

// AuthorizationPolicy enables access control on workloads.
message AuthorizationPolicy {
  // Optional. The selector decides where to apply the authorization policy. The selector will match with workloads
  // in the same namespace as the authorization policy. If the authorization policy is in the root namespace, the selector
  // will additionally match with workloads in all namespaces.
  //
  // If the selector and the targetRef are not set, the selector will match all workloads.
  //
  // At most one of selector or targetRefs can be set for a given policy.
  istio.type.v1beta1.WorkloadSelector selector = 1;

  // Optional. The targetRefs specifies a list of resources the policy should be
  // applied to. The targeted resources specified will determine which workloads
  // the policy applies to.
  //
  // Currently, the following resource attachment types are supported:
  // * kind: Gateway with group: gateway.networking.k8s.io in the same namespace.
  // * kind: Service with "" in the same namespace. This type is only supported for waypoints.
  //
  // If not set, the policy is applied as defined by the selector.
  // At most one of the selector and targetRefs can be set.
  //
  // NOTE: If you are using the targetRefs field in a multi-revision environment with Istio versions prior to 1.22,
  // it is highly recommended that you pin the policy to a revision running 1.22+ via the istio.io/rev label.
  // This is to prevent proxies connected to older control planes (that don't know about the targetRefs field)
  // from misinterpreting the policy as namespace-wide during the upgrade process.
  //
  // NOTE: Waypoint proxies are required to use this field for policies to apply; selector policies will be ignored.
  repeated istio.type.v1beta1.PolicyTargetReference targetRefs = 6;

  // Optional. A list of rules to match the request. A match occurs when at least one rule matches the request.
  //
  // If not set, the match will never occur. This is equivalent to setting a default of deny for the target workloads if
  // the action is ALLOW.
  repeated Rule rules = 2;

  // Action specifies the operation to take.
  enum Action {
    // Allow a request only if it matches the rules. This is the default type.
    ALLOW = 0;

    // Deny a request if it matches any of the rules.
    DENY = 1;

    // Audit a request if it matches any of the rules.
    AUDIT = 2;

    CUSTOM = 3;
  }

  // Optional. The action to take if the request is matched with the rules. Default is ALLOW if not specified.
  Action action = 3;

  message ExtensionProvider {
    // Specifies the name of the extension provider. The list of available providers is defined in the MeshConfig.
    // Note, currently at most 1 extension provider is allowed per workload. Different workloads can use different extension provider.
    string name = 1;
  }

  oneof action_detail {
    // Specifies detailed configuration of the CUSTOM action. Must be used only with CUSTOM action.
    ExtensionProvider provider = 4;
  }
}

// Rule matches requests from a list of sources that perform a list of operations subject to a
// list of conditions. A match occurs when at least one source, one operation and all conditions
// matches the request. An empty rule is always matched.
//
// Any string field in the rule supports Exact, Prefix, Suffix and Presence match:
//
// - Exact match: abc will match on value abc.
// - Prefix match: abc* will match on value abc and abcd.
// - Suffix match: *abc will match on value abc and xabc.
// - Presence match: * will match when value is not empty.
message Rule {
  // From includes a list of sources.
  message From {
    // Source specifies the source of a request.
    Source source = 1;
  }

  // Optional. from specifies the source of a request.
  //
  // If not set, any source is allowed.
  repeated From from = 1;

  // To includes a list of operations.
  message To {
    // Operation specifies the operation of a request.
    Operation operation = 1;
  }

  // Optional. to specifies the operation of a request.
  //
  // If not set, any operation is allowed.
  repeated To to = 2;

  // Optional. when specifies a list of additional conditions of a request.
  //
  // If not set, any condition is allowed.
  repeated Condition when = 3;
}

// Source specifies the source identities of a request. Fields in the source are
// ANDed together.
//
// For example, the following source matches if the principal is admin or dev
// and the namespace is prod or test and the ip is not 203.0.113.4.
//
// yaml
// principals: ["admin", "dev"]
// namespaces: ["prod", "test"]
// notIpBlocks: ["203.0.113.4"]
// 
message Source {
  // Optional. A list of peer identities derived from the peer certificate. The peer identity is in the format of
  // "<TRUST_DOMAIN>/ns/<NAMESPACE>/sa/<SERVICE_ACCOUNT>", for example, "cluster.local/ns/default/sa/productpage".
  // This field requires mTLS enabled and is the same as the source.principal attribute.
  //
  // If not set, any principal is allowed.
  repeated string principals = 1;

  // Optional. A list of negative match of peer identities.
  repeated string not_principals = 5;

  // Optional. A list of request identities derived from the JWT. The request identity is in the format of
  // "<ISS>/<SUB>", for example, "example.com/sub-1". This field requires request authentication enabled and is the
  // same as the request.auth.principal attribute.
  //
  // If not set, any request principal is allowed.
  repeated string request_principals = 2;

  // Optional. A list of negative match of request identities.
  repeated string not_request_principals = 6;

  // Optional. A list of namespaces derived from the peer certificate.
  // This field requires mTLS enabled and is the same as the source.namespace attribute.
  //
  // If not set, any namespace is allowed.
  repeated string namespaces = 3;

  // Optional. A list of negative match of namespaces.
  repeated string not_namespaces = 7;

  // Optional. A list of IP blocks, populated from the source address of the IP packet. Single IP (e.g. 203.0.113.4) and
  // CIDR (e.g. 203.0.113.0/24) are supported. This is the same as the source.ip attribute.
  //
  // If not set, any IP is allowed.
  repeated string ip_blocks = 4;

  // Optional. A list of negative match of IP blocks.
  repeated string not_ip_blocks = 8;

  // Optional. A list of IP blocks, populated from X-Forwarded-For header or proxy protocol.
  // To make use of this field, you must configure the numTrustedProxies field of the gatewayTopology under the meshConfig
  // when you install Istio or using an annotation on the ingress gateway.  See the documentation here:
  // [Configuring Gateway Network Topology](https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/).
  // Single IP (e.g. 203.0.113.4) and CIDR (e.g. 203.0.113.0/24) are supported.
  // This is the same as the remote.ip attribute.
  //
  // If not set, any IP is allowed.
  repeated string remote_ip_blocks = 9;

  // Optional. A list of negative match of remote IP blocks.
  repeated string not_remote_ip_blocks = 10;
}

// Operation specifies the operations of a request. Fields in the operation are
// ANDed together.
//
// For example, the following operation matches if the host has suffix .example.com
// and the method is GET or HEAD and the path doesn't have prefix /admin.
//
// yaml
// hosts: ["*.example.com"]
// methods: ["GET", "HEAD"]
// notPaths: ["/admin*"]
// 
message Operation {
  // Optional. A list of hosts as specified in the HTTP request. The match is case-insensitive.
  // See the [security best practices](https://istio.io/latest/docs/ops/best-practices/security/#writing-host-match-policies) for
  // recommended usage of this field.
  //
  // If not set, any host is allowed. Must be used only with HTTP.
  repeated string hosts = 1;

  // Optional. A list of negative match of hosts as specified in the HTTP request. The match is case-insensitive.
  repeated string not_hosts = 5;

  // Optional. A list of ports as specified in the connection.
  //
  // If not set, any port is allowed.
  repeated string ports = 2;

  // Optional. A list of negative match of ports as specified in the connection.
  repeated string not_ports = 6;

  // Optional. A list of methods as specified in the HTTP request.
  // For gRPC service, this will always be POST.
  //
  // If not set, any method is allowed. Must be used only with HTTP.
  repeated string methods = 3;

  // Optional. A list of negative match of methods as specified in the HTTP request.
  repeated string not_methods = 7;

  // Optional. A list of paths as specified in the HTTP request. See the [Authorization Policy Normalization](https://istio.io/latest/docs/reference/config/security/normalization/)
  // for details of the path normalization.
  // For gRPC service, this will be the fully-qualified name in the form of /package.service/method.
  //
  // If a path in the list contains the {*} or {**} path template operator, it will be interpreted as an [Envoy Uri Template](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/path/match/uri_template/v3/uri_template_match.proto).
  // To be a valid path template, the path must not contain *, {, or } outside of a supported operator. No other characters are allowed in the path segment with the path template operator.
  // - {*} matches a single glob that cannot extend beyond a path segment.
  // - {**} matches zero or more globs. If a path contains {**}, it must be the last operator.
  //
  // Examples:
  // - /foo/{*} matches /foo/bar but not /foo/bar/baz
  // - /foo/{**}/ matches /foo/bar/, /foo/bar/baz.txt, and /foo// but not /foo/bar
  // - /foo/{*}/bar/{**} matches /foo/buzz/bar/ and /foo/buzz/bar/baz
  // - /*/baz/{*} is not a valid path template since it includes * outside of a supported operator
  // - /**/baz/{*} is not a valid path template since it includes ** outside of a supported operator
  // - /{**}/foo/{*} is not a valid path template since {**} is not the last operator
  // - /foo/{*}.txt is invalid since there are characters other than {*} in the path segment
  //
  // If not set, any path is allowed. Must be used only with HTTP.
  repeated string paths = 4;

  // Optional. A list of negative match of paths.
  repeated string not_paths = 8;
}

// Condition specifies additional required attributes.
message Condition {
  // The name of an Istio attribute.
  // See the [full list of supported attributes](https://istio.io/docs/reference/config/security/conditions/).
  string key = 1 [(google.api.field_behavior) = REQUIRED];

  // Optional. A list of allowed values for the attribute.
  // Note: at least one of values or notValues must be set.
  repeated string values = 2;

  // Optional. A list of negative match of values for the attribute.
  // Note: at least one of values or notValues must be set.
  repeated string not_values = 3;
};
"""


class IstioCrdPromptTemplate(PromptTemplate):
    """Specific template for Istio CRD-related prompts."""

    def __init__(self, crd_type: "IstioCrdType"):
        self.crd_type = crd_type
        super().__init__(
            name=f"Istio {crd_type.value} Template",
            description=f"Template for generating {crd_type.value} configurations",
            version="0.0.1",
            sections=[
                PromptSection(
                    name="Role Definition",
                    content="You're an Istio CRD agent. You modify or create a new JSON based on the UQ. "
                    "The JSON must conform to the PROTO SPEC. The response must only include one "
                    "or more {resource_type} resource type.",
                    variables=[
                        TemplateVariable("resource_type", "The Istio resource type"),
                    ],
                ),
                PromptSection(
                    name="Proto Spec",
                    content="PROTO SPEC:\n{proto_spec}",
                    variables=[
                        TemplateVariable("proto_spec", "The protobuf specification"),
                    ],
                ),
                PromptSection(
                    name="Examples",
                    content="EXAMPLES:\n{examples}",
                    variables=[
                        TemplateVariable("examples", "Example configurations"),
                    ],
                ),
            ],
        )


def get_istio_crd_prompt(crd_type: "IstioCrdType") -> str:
    """Generate a prompt for an Istio CRD."""
    template = IstioCrdPromptTemplate(crd_type)
    return template.render(
        {
            "resource_type": crd_type.value,
            "proto_spec": AUTHORIZATION_POLICY_PROTO,
            "examples": "\n".join(
                str(example) for example in AUTHORIZATION_POLICY_EXAMPLES
            ),
        },
    )
