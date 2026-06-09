# MS Trial Visit Calculator

Aplicación web ligera para planificar las visitas de pacientes en ensayos clínicos de Esclerosis Múltiple. Permite a cada centro hospitalario adaptar el Schedule of Activities (basado en ALLEGRO MS-LAQ-301), gestionar perfiles de pacientes y calcular fechas propuestas, ventanas temporales y duración estimada (en el hospital + transporte en taxi).

## Características

- **Login simulado** con perfiles por centro (Vall d'Hebron / Cemcat, Clínic, Bellvitge, Germans Trias i Pujol)
- **Tema visual** que se adapta al hospital del usuario logueado
- **Editor de protocolos** por centro con sistema semáforo:
  - Verde = obligatorio (bloqueado por el protocolo)
  - Naranja = "Si procede" (decisión clínica por paciente)
  - Gris = no forma parte del protocolo
- **Duraciones revisables** por centro, con barra de progreso de revisión
- **Calculadora**: fechas propuestas, ventanas, duración estimada
- **Cálculo de ruta en taxi** automático usando Nominatim (OSM) + OSRM
- **Resumen PDF** para el paciente con calendario simplificado
- **Perfiles de paciente** persistentes en localStorage (con creación de nuevos pacientes)

## Stack

- HTML5, CSS3, JavaScript vanilla (sin dependencias ni build)
- Persistencia: `localStorage`
- APIs externas (gratuitas): Nominatim (geocoding) y OSRM (routing)

## Ejecutar localmente

```bash
python3 -m http.server 8765
```

Después abrir `http://localhost:8765/login.html`.

## Despliegue

GitHub Pages, desplegado automáticamente en cada push a `main` (ver `.github/workflows/pages.yml`).

## Referencia / fuente del protocolo

El Schedule of Activities (visitas y procedimientos) utilizado en esta aplicación está basado en el ensayo clínico **ALLEGRO** (MS-LAQ-301):

> Comi G, Jeffery D, Kappos L, Montalban X, Boyko A, Rocca MA, Filippi M; ALLEGRO Study Group. Placebo-controlled trial of oral laquinimod for multiple sclerosis. *N Engl J Med.* 2012;366(11):1000–1009. doi:[10.1056/NEJMoa1104318](https://doi.org/10.1056/NEJMoa1104318)

### Ventanas de visita (supuestos y fuentes)

Tras revisar el protocolo completo del ALLEGRO (MS-LAQ-301, enmienda nº 4, 353 páginas), las ventanas temporales se han fijado así:

| Visita / prueba | Ventana aplicada | Fuente |
|---|---|---|
| Screening (Mes −1) | hasta 30 días antes del baseline (0 / +30 d) | Protocolo §8.3.1 |
| Baseline (Mes 0) | sin ventana (anclaje de randomización) | Protocolo §8.3.2–8.3.3 |
| RM (resonancia) | ±4 días respecto a la visita; basal 13–7 d antes; terminación dentro de los 4 d previos | Protocolo §10.1.12 |
| Llamadas de trombosis | 14 ± 2 días tras la visita | Protocolo (safety) |
| Test de embarazo en casa | cada 28 ± 2 días | Protocolo §8.3.4 |
| **Visitas programadas V1–V9 y Terminación** | **±7 días (±14 en terminación)** | **Supuesto del TFM** |

> **Nota importante:** el protocolo del ALLEGRO **no especifica ninguna ventana temporal para las visitas de tratamiento programadas** (V1–V9 ni terminación); solo define tolerancias a nivel de prueba concreta (RM, llamadas, test de embarazo). Por ello, las ventanas de ±7 días (±14 en la visita de terminación) aplicadas en la calculadora son un **supuesto operativo de este TFM**, basado en la práctica habitual en ensayos clínicos de esclerosis múltiple, y no un dato extraído del protocolo.

## TFM

Proyecto desarrollado como parte de un Trabajo de Final de Máster.
