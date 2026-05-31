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

## TFM

Proyecto desarrollado como parte de un Trabajo de Final de Máster.
