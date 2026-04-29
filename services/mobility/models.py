import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class MobilityDriver(Base):
    __tablename__ = "mobility_drivers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    aadhaar_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    aadhaar_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    license_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    current_area_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="active")
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=4.8)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    vehicle: Mapped["MobilityVehicle | None"] = relationship(
        "MobilityVehicle",
        back_populates="driver",
        uselist=False,
        cascade="all, delete-orphan",
    )
    ride_leads: Mapped[list["MobilityRideLead"]] = relationship(
        "MobilityRideLead",
        back_populates="driver",
        foreign_keys="MobilityRideLead.assigned_driver_id",
    )
    requested_ride_leads: Mapped[list["MobilityRideLead"]] = relationship(
        "MobilityRideLead",
        foreign_keys="MobilityRideLead.requested_driver_id",
    )


class MobilityVehicle(Base):
    __tablename__ = "mobility_vehicles"
    __table_args__ = (
        UniqueConstraint("driver_id", name="uq_mobility_vehicle_driver"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mobility_drivers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    vehicle_name: Mapped[str] = mapped_column(String(200), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(80), nullable=False, default="Cab")
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    plate_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    color: Mapped[str | None] = mapped_column(String(80), nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    seat_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    air_conditioned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    rc_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    insurance_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_urls: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    rc_image_urls: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    insurance_image_urls: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    availability_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_fare: Mapped[float] = mapped_column(Float, nullable=False, default=250.0)
    per_km_rate: Mapped[float] = mapped_column(Float, nullable=False, default=18.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    driver: Mapped[MobilityDriver] = relationship("MobilityDriver", back_populates="vehicle")


class MobilityRideLead(Base):
    __tablename__ = "mobility_ride_leads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requested_driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mobility_drivers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mobility_drivers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    customer_user_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    pickup_label: Mapped[str] = mapped_column(String(255), nullable=False)
    drop_label: Mapped[str] = mapped_column(String(255), nullable=False)
    pickup_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    pickup_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    drop_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    drop_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    passengers: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    tier_key: Mapped[str] = mapped_column(String(40), nullable=False, default="tier_1")
    tier_label: Mapped[str] = mapped_column(String(80), nullable=False, default="Tier 1")
    tier_radius_km: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    tier_fare: Mapped[float] = mapped_column(Float, nullable=False, default=20.0)
    trip_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    estimated_fare: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    commission_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    payment_status: Mapped[str] = mapped_column(String(40), nullable=False, default="paid")
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="paid")
    source: Mapped[str] = mapped_column(String(80), nullable=False, default="customer_app")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    driver: Mapped[MobilityDriver | None] = relationship(
        "MobilityDriver",
        back_populates="ride_leads",
        foreign_keys=[assigned_driver_id],
    )
    requested_driver: Mapped[MobilityDriver | None] = relationship(
        "MobilityDriver",
        foreign_keys=[requested_driver_id],
    )
