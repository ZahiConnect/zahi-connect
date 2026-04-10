from fastapi import HTTPException, Request, status


CUSTOMER_PORTAL = "customer"
WORKSPACE_PORTAL = "workspace"
SHARED_PORTAL = "shared"
KNOWN_PORTALS = {CUSTOMER_PORTAL, WORKSPACE_PORTAL, SHARED_PORTAL}

CUSTOMER_ROLES = {"customer"}
WORKSPACE_ROLES = {"super_admin", "business_admin", "staff", "driver", "guide"}


def normalize_client_portal(portal: str | None) -> str:
    candidate = str(portal or "").strip().lower()
    return candidate if candidate in KNOWN_PORTALS else SHARED_PORTAL


def get_client_portal(request: Request | None) -> str:
    if request is None:
        return SHARED_PORTAL
    return normalize_client_portal(request.headers.get("X-Zahi-Portal"))


def get_registration_role(requested_role: str | None, portal: str) -> str:
    role = str(requested_role or "").strip().lower()
    if portal == CUSTOMER_PORTAL:
        return "customer"
    if portal == WORKSPACE_PORTAL:
        return role if role in WORKSPACE_ROLES else "business_admin"
    return role or "customer"


def assert_user_matches_portal(user, portal: str) -> None:
    if portal == CUSTOMER_PORTAL and user.role not in CUSTOMER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account belongs to the workspace portal. Use the business frontend instead.",
        )

    if portal == WORKSPACE_PORTAL and user.role not in WORKSPACE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer accounts can only sign in on the user frontend.",
        )
