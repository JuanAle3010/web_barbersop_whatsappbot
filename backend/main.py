# backend/main.py
import json
import uuid
import re
from pathlib import Path
from typing import List, Optional, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

DATA_FILE = Path("citas.json")
STYLISTS = ["Diego", "Jose Luís"]
CONFIG_FILE = Path("config.json")

def load_config() -> dict:
    if not CONFIG_FILE.exists():
        raise RuntimeError("Archivo de configuración no encontrado")
    return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))

CONFIG = load_config()
STYLISTS = CONFIG["stylists"]


def load_data() -> List[dict]:
    if not DATA_FILE.exists():
        DATA_FILE.write_text("[]", encoding="utf-8")
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))

def save_data(citas: List[dict]) -> None:
    DATA_FILE.write_text(json.dumps(citas, ensure_ascii=False, indent=2), encoding="utf-8")

def normalize_phone(raw_phone: str) -> str:
    digits = re.sub(r"\D", "", raw_phone)
    if not digits.startswith("34"):
        digits = "34" + digits
    return digits

class AppointmentIn(BaseModel):
    nombre: str = Field(..., min_length=1)
    telefono: str = Field(..., min_length=3)
    fecha: str = Field(..., regex=r"^\d{4}-\d{2}-\d{2}$")
    hora: str = Field(..., regex=r"^\d{2}:\d{2}$")
    peluquero: Optional[str] = None

class Appointment(AppointmentIn):
    id: str
    estado: Literal["Pendiente", "Pagado"] = "Pendiente"

class AppointmentUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    fecha: Optional[str] = Field(None, regex=r"^\d{4}-\d{2}-\d{2}$")
    hora: Optional[str] = Field(None, regex=r"^\d{2}:\d{2}$")
    peluquero: Optional[str] = None
    estado: Optional[Literal["Pendiente", "Pagado"]] = None

app = FastAPI(title="Calendario Profesional (Web MVP)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

@app.get("/api/config")
def get_config():
    return CONFIG


@app.get("/api/stylists", response_model=List[str])
def get_stylists():
    return STYLISTS

@app.get("/api/appointments", response_model=List[Appointment])
def list_appointments(fecha: Optional[str] = None, peluquero: Optional[str] = None):
    citas = load_data()
    changed = False
    for c in citas:
        if "estado" not in c:
            c["estado"] = "Pendiente"; changed = True
        if "id" not in c:
            c["id"] = str(uuid.uuid4()); changed = True
        if "peluquero" not in c or not c["peluquero"]:
            c["peluquero"] = STYLISTS[0]; changed = True
    if changed:
        save_data(citas)

    if fecha:
        citas = [c for c in citas if c.get("fecha") == fecha]
    if peluquero:
        citas = [c for c in citas if c.get("peluquero") == peluquero]

    citas.sort(key=lambda x: x.get("hora", "00:00"))
    return citas

@app.post("/api/appointments", response_model=Appointment, status_code=201)
def create_appointment(payload: AppointmentIn):
    citas = load_data()
    appt = payload.dict()

    if not appt.get("peluquero"):
        appt["peluquero"] = STYLISTS[0]

    # Conflicto solo dentro del mismo peluquero
    clash = next(
        (
            c for c in citas
            if c.get("fecha") == appt["fecha"]
            and c.get("hora") == appt["hora"]
            and c.get("peluquero") == appt["peluquero"]
        ),
        None
    )
    if clash:
        raise HTTPException(status_code=409, detail="Hueco ocupado")

    appt["id"] = str(uuid.uuid4())
    appt["estado"] = "Pendiente"
    appt["telefono"] = normalize_phone(appt["telefono"])
    citas.append(appt)
    save_data(citas)
    return appt

@app.patch("/api/appointments/{appt_id}", response_model=Appointment)
def update_appointment(appt_id: str, payload: AppointmentUpdate):
    citas = load_data()
    for c in citas:
        if c.get("id") == appt_id:
            update = payload.dict(exclude_unset=True)
            if "telefono" in update:
                update["telefono"] = normalize_phone(update["telefono"])
            c.update(update)
            save_data(citas)
            return c
    raise HTTPException(404, "Cita no encontrada")

@app.delete("/api/appointments/{appt_id}", status_code=204)
def delete_appointment(appt_id: str):
    citas = load_data()
    new_citas = [c for c in citas if c.get("id") != appt_id]
    if len(new_citas) == len(citas):
        raise HTTPException(404, "Cita no encontrada")
    save_data(new_citas)
    return

# Servir frontend
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")








