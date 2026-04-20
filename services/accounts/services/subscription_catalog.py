PLAN_CATALOG = {
    "restaurant-pro": {
        "code": "restaurant-pro",
        "name": "Restaurant Control Room",
        "business_type": "restaurant",
        "amount": 249900,
        "display_price": "Rs. 2,499 / month",
        "badge": "Best for cloud kitchens and dine-in brands",
        "headline": "Menu, kitchen, orders, tables, and AI ordering in one place.",
        "description": (
            "Built for owners who want WhatsApp ordering on the front and a live "
            "operations board in the back."
        ),
        "featured": True,
        "features": [
            "Digital menu management",
            "Kitchen order board with live updates",
            "Inventory and low-stock visibility",
            "WhatsApp-first ordering concierge",
            "Owner analytics and daily revenue snapshots",
        ],
        "dashboard_modules": [
            "Menu",
            "Kitchen",
            "Orders",
            "Tables",
            "Inventory",
            "Reports",
        ],
    },
    "hotel-growth": {
        "code": "hotel-growth",
        "name": "Hotel Stay Engine",
        "business_type": "hotel",
        "amount": 349900,
        "display_price": "Rs. 3,499 / month",
        "badge": "Best for boutique hotels and serviced stays",
        "headline": "Bookings, room pricing, guest operations, and concierge-ready onboarding.",
        "description": (
            "A hospitality workspace that is ready for your friend's StayInn module "
            "to plug in next."
        ),
        "featured": False,
        "features": [
            "Booking workspace and guest pipeline",
            "Room and availability command center",
            "Seasonal pricing and manual overrides",
            "WhatsApp concierge for stay requests",
            "Ready for StayInn integration next",
        ],
        "dashboard_modules": [
            "Bookings",
            "Rooms",
            "Pricing",
            "Reports",
        ],
    },
    "mobility-lite": {
        "code": "mobility-lite",
        "name": "Mobility Dispatch Pack",
        "business_type": "mobility",
        "amount": 149900,
        "display_price": "Rs. 1,499 / month",
        "badge": "Best for local fleets, autos, and driver collectives",
        "headline": "Simple ride request dispatch with driver alerts and owner visibility.",
        "description": (
            "A lean package for auto, cab, and local transport businesses that want "
            "WhatsApp demand and a web dispatch board."
        ),
        "featured": False,
        "features": [
            "Ride request board",
            "Driver roster and availability",
            "Fleet summary workspace",
            "WhatsApp pickup intent capture",
            "Fast owner-side dispatch visibility",
        ],
        "dashboard_modules": [
            "Ride Requests",
            "Drivers",
            "Fleet",
            "Reports",
        ],
    },
    "flight-pro": {
        "code": "flight-pro",
        "name": "Flight Command Pack",
        "business_type": "flight",
        "amount": 449900,
        "display_price": "Rs. 4,499 / month",
        "badge": "Best for airlines, charter operators, and regional carriers",
        "headline": "Schedule flights, manage bookings, and sell seats directly through Zahi.",
        "description": (
            "A full airline operations workspace — publish your flight schedule, "
            "set fares by class, and let passengers book directly on the Zahi platform."
        ),
        "featured": False,
        "features": [
            "Flight schedule management (routes, times, days)",
            "Economy, Business, and First class seat configuration",
            "Real-time seat availability and booking",
            "Passenger management and ID verification",
            "Revenue tracking and booking reports",
        ],
        "dashboard_modules": [
            "Bookings",
            "Schedule",
            "Pricing",
            "Passengers",
            "Reports",
        ],
    },
}


def list_subscription_plans():
    return list(PLAN_CATALOG.values())


def get_plan_by_code(plan_code: str):
    return PLAN_CATALOG.get(plan_code)
