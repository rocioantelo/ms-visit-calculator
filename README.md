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

## TFM

Proyecto desarrollado como parte de un Trabajo de Final de Máster.
