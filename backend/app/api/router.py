from fastapi import APIRouter
import importlib
import logging
import pkgutil
from types import ModuleType

import app.api.routes as routes_pkg

logger = logging.getLogger(__name__)


def _discover_and_include(api_router: APIRouter, package: ModuleType) -> None:
	"""Dynamically import submodules under the given package and include
	any attribute named `router` found in them.

	This makes adding new route modules (e.g. `products.py`, `sales.py`)
	resilient at application startup without relying on manual edits.
	"""
	for finder, name, ispkg in pkgutil.iter_modules(package.__path__):
		full_name = f"{package.__name__}.{name}"
		try:
			module = importlib.import_module(full_name)
		except Exception as exc:  # pragma: no cover - runtime import errors
			logger.exception("Failed to import route module %s: %s", full_name, exc)
			continue

		router_obj = getattr(module, "router", None)
		if router_obj is not None:
			try:
				api_router.include_router(router_obj)
				logger.info("Included router from %s", full_name)
			except Exception:  # pragma: no cover - include issues
				logger.exception("Failed to include router from %s", full_name)


api_router = APIRouter()

# Discover and include routers from the `app.api.routes` package
_discover_and_include(api_router, routes_pkg)

# Manually include tenant routes (production-critical)
try:
	from app.api.routes.tenants import router as tenants_router
	api_router.include_router(tenants_router)
	logger.info("Included tenant management routes")
except ImportError as exc:
	logger.error("Failed to import tenant routes: %s", exc)
except Exception as exc:
	logger.exception("Failed to include tenant routes: %s", exc)

