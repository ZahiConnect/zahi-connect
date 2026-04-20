from pydantic import BaseModel, EmailStr, Field


class VehicleUpsertSchema(BaseModel):
    vehicle_name: str
    vehicle_type: str = "Cab"
    brand: str | None = None
    model: str | None = None
    plate_number: str
    color: str | None = None
    year: int | None = None
    seat_capacity: int = 4
    air_conditioned: bool = True
    photo_url: str | None = None
    rc_image_url: str | None = None
    insurance_image_url: str | None = None
    availability_notes: str | None = None
    base_fare: float = 250.0
    per_km_rate: float = 18.0


class DriverRegisterSchema(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str = Field(min_length=6)
    aadhaar_number: str | None = None
    aadhaar_image_url: str | None = None
    license_number: str | None = None
    license_image_url: str | None = None
    profile_photo_url: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    current_area_label: str | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None
    vehicle: VehicleUpsertSchema


class DriverLoginSchema(BaseModel):
    identifier: str
    password: str


class DriverProfileUpdateSchema(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    aadhaar_number: str | None = None
    aadhaar_image_url: str | None = None
    license_number: str | None = None
    license_image_url: str | None = None
    profile_photo_url: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    current_area_label: str | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None


class DriverStatusSchema(BaseModel):
    is_online: bool
    current_area_label: str | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None


class RideRequestCreateSchema(BaseModel):
    selected_driver_id: str | None = None
    customer_user_id: str | None = None
    customer_name: str | None = None
    customer_email: EmailStr | None = None
    customer_phone: str | None = None
    pickup_label: str
    drop_label: str
    pickup_latitude: float | None = None
    pickup_longitude: float | None = None
    drop_latitude: float | None = None
    drop_longitude: float | None = None
    passengers: int = 1
    notes: str | None = None
    source: str = "customer_app"


class NearbyDriversQuery(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float = 25.0
    limit: int = 8
