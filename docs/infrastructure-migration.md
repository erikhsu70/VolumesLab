# Migración de infraestructura a Erik

Estado comprobado el 3 de noviembre de 2026. Esta preparación no constituye
una migración completada ni cambia los destinos de producción.

## Restricción de coste vigente

Erik ha descartado los pagos: no contratar Workers Paid ni habilitar servicios
con facturación por exceso de consumo. Se salió del checkout sin confirmar la
compra. La propuesta del PDF queda subordinada a esta restricción.

- **Web:** evaluar Workers Free con pruebas reales de CPU, peticiones y arranque;
  que compile no garantiza que soporte la carga dentro del plan gratuito.
- **Base de datos:** Neon Free en Frankfurt, si el dump y consumo caben en sus
  cuotas. La tarifa consultada incluye 1 GB y 100 CU-h/mes por proyecto, sin
  tarjeta. No activar Launch ni Scale.
- **CMS:** no afirmar que Payload necesita Paid solo por tamaño: la documentación
  vigente indica 64 MiB sin comprimir tanto en Free como en Paid. Free sigue
  limitado a 10 ms de CPU por petición; hay que medir login, administración,
  API y medios con el repositorio real antes de comprometer el destino.
- **Imágenes:** R2 incluye una franquicia gratuita pero factura excesos y requiere
  suscripción. No activarlo bajo la restricción actual de evitar cargos. Evaluar
  almacenamiento sin facturación automática y compatible con el CMS cuando se
  conozca el inventario de medios.
- **Alternativa:** si Payload no funciona en Free, evaluar un VPS ya contratado
  solo si Erik confirma que admite reutilizar infraestructura existente. Si exige
  exclusivamente planes gratuitos, revisar otra arquitectura sin eliminar el CMS
  actual ni sustituir su flujo editorial de forma unilateral.
- **Vercel Hobby:** no es una alternativa para alojar gratis este negocio; sus
  condiciones lo restringen a uso personal no comercial.

Fuentes consultadas el 3 de noviembre de 2026:
[Workers Free](https://developers.cloudflare.com/workers/platform/limits/),
[Neon Free](https://neon.com/pricing),
[R2](https://developers.cloudflare.com/r2/pricing/),
[uso de Vercel Hobby](https://vercel.com/docs/limits/fair-use-guidelines).

## Evidencia y dependencias pendientes

| Elemento | Comprobado | Pendiente para continuar |
| --- | --- | --- |
| Web | `PedroVader/VolumesLab`, rama `master`; Erik tiene permiso de escritura, no de administración | Transferencia del repositorio y aceptación por Erik |
| CMS | Repositorio independiente llamado `volumes-cms`, según `.gitignore`; no aparece entre los repositorios accesibles. Consulta a `PedroVader/volumes-cms`: 404 | URL exacta y acceso al código; cuenta administradora del CMS |
| Cloudflare | Acceso web confirmado a la cuenta de Erik `905ffd22734f2d0ef6319dd1fd356e2d`; Wrangler sigue caducado. Workers está en Free; compra descartada | Validar viabilidad en Free, identificar destino de producción y renovar acceso CLI |
| Neon | El navegador solicita iniciar sesión | Cuenta de Erik, proyecto Frankfurt y copia completa de la base de datos |
| Imágenes | El plan sitúa los originales en Vercel Blob | Inventario completo, acceso para copiar y comprobar R2 |
| Producción | `https://volumeslab.com` devuelve 308 a `https://www.volumeslab.com/`; `www` y `/admin` del CMS devuelven 200 con `server: Vercel` | Identificar el Worker existente y validar su relación con la web pública |

La web pública observada está en Vercel, aunque el plan describe un Worker
existente en Cloudflare. No sustituir el Worker ni cambiar DNS hasta identificar
la versión que se va a publicar y comparar ambas webs.

El panel confirma que `volumeslab.com` está activo en la cuenta Cloudflare de
Nicolás (`013261f6c725024d2398f5856c8b5797`), accesible desde la sesión de Erik.
No aparece en la cuenta propia de Erik. Los Workers encontrados por nombre en
la cuenta de Erik son `volumeslab-landing-demos` y `tanstack-start-app` (este
último sin rutas activas); no se ha identificado todavía el Worker de producción
descrito en el plan. Resolver la propiedad de la zona y la vinculación de dominios
entre cuentas antes del corte; el acceso delegado no equivale a la titularidad.

## DNS público observado

Esto es una consulta parcial, **no una exportación completa de la zona**:

| Nombre | Tipo | Valor observado |
| --- | --- | --- |
| `volumeslab.com` | NS | `cass.ns.cloudflare.com.`, `arch.ns.cloudflare.com.` |
| `volumeslab.com` | MX | `10 smtp.google.com.` |
| `volumeslab.com` | A | `216.150.16.193`, `216.150.1.193` |
| `www.volumeslab.com` | CNAME | `86f9ff6373a28456.vercel-dns-016.com.` |
| `cms.volumeslab.com` | CNAME | `cname.vercel-dns.com.` |
| `_dmarc.volumeslab.com` | TXT | `v=DMARC1;p=none;` |

También se observaron TXT de verificación de Google y Apple en el dominio raíz.
El MX apunta a Google; falta confirmar quién administra el buzón `hello@`.
Exportar la zona desde la cuenta que la gestiona, incluidos TTL, proxy, MX, SPF,
DKIM, DMARC, verificaciones, CAA y subdominios. Los NS ya son de Cloudflare;
no asumir que hay que cambiarlos. Conservar la exportación para rollback.

**Copia realizada:** se descargó la exportación BIND del panel de Cloudflare y
se guardó localmente como `volumeslab.com-before-migration.bind`. Contiene los
13 registros mostrados por el panel (6 CNAME, 2 MX y 5 TXT), además de SOA y
los dos NS. Incluye los registros de Google y Momence. No se modificó la zona.

## Cambio preparado en esta rama

Ambos lectores del CMS y sus URLs relativas de imágenes usan `VITE_CMS_URL`.
Sin configurar nada, siguen usando `https://volumes-cms.vercel.app`.
Copiar `.env.example` a `.env.local` para trabajar localmente. La variable es
pública y se incorpora al compilar; no debe contener contraseñas ni tokens.

Para probar el destino, configurar su origen en el entorno de **build**:

```sh
VITE_CMS_URL=https://cms.volumeslab.com npm run build
```

Cambiar una variable del Worker sin reconstruir no cambia este valor.
Volver al CMS anterior requiere reconstruir con el origen anterior y desplegar,
o restaurar una versión previa del Worker. Se mantiene el comportamiento
existente de contenido de reserva durante fallos del CMS.

## Ejecución cuando estén disponibles los accesos y un destino sin gastos

Los pasos de R2 y CMS en Workers del plan original son condicionales: no
ejecutarlos si exigen contratar un plan o autorizar cargos. El destino definitivo
debe respetar la restricción de coste anterior.

1. **Recibir el traspaso.** Aceptar ambos repositorios; recibir dump PostgreSQL
   completo, versión del servidor, extensiones, recuentos por tabla, inventario
   de medios con tamaños/checksums, variables requeridas y documentación del CMS.
   Entregar secretos por un canal seguro, fuera de Git y del historial del chat.
2. **Preparar Neon Frankfurt.** Crear el proyecto en la cuenta de Erik y una
   base vacía para restaurar. Usar conexión directa para restauraciones y
   migraciones, con cliente PostgreSQL compatible con el dump. No ejecutar un
   restore destructivo contra la base actual. Comparar tablas, filas, relaciones,
   secuencias, usuarios, borradores, versiones y estado de migraciones de Payload.
3. **Preparar R2.** Copiar todos los objetos, también variantes de imagen,
   preservando claves, tipos de contenido y metadatos. Comparar inventario,
   tamaños y checksums. Adaptar las referencias de Blob según el esquema real;
   la variable de la web no reescribe URLs absolutas guardadas en la base.
4. **Adaptar el CMS en una rama.** Revisar las versiones reales de Payload,
   Next y dependencias antes de escoger el adaptador para Workers. Configurar
   Neon mediante Hyperdrive y almacenamiento R2; secretos solo en el entorno.
   Validar cargas y transformación de imágenes, CORS/CSRF, cookies, URLs públicas,
   conexiones, límites del Worker y migraciones. Mantener Vercel operativo.
5. **Validar en paralelo.** Usar una URL de staging y la copia de Neon. Probar
   inicio/cierre de sesión, permisos, creación/edición/publicación, borradores,
   subida/lectura de imágenes, colecciones completas y la web con ese CMS.
   Comprobar reservas, rutas, redirecciones, canonical, robots y sitemap.
6. **Conectar la web a Workers Builds.** Seleccionar el repositorio transferido,
   rama aprobada y el Worker identificado. El build actual genera
   `.output/server/wrangler.json` con preset `cloudflare-module`.
   Verificar nombre y cuenta del Worker antes del primer deploy: Nitro generó
   `pedrovader-volumeslab` en la comprobación local, que no demuestra que sea el
   Worker de producción. Configurar instalación `npm ci`, build `npm run build`
   y deploy `npx nitro deploy --prebuilt` solo después de fijar ese destino.
7. **Cambiar producción.** Acordar una breve pausa de edición o sincronización
   incremental para no perder cambios hechos en Vercel desde la primera copia.
   Hacer backup final y sincronizar datos e imágenes. Conectar
   `cms.volumeslab.com`, reconstruir la web con ese origen y conectar los dominios
   web, conservando el comportamiento actual de dominio raíz/www. Comprobar HTTPS,
   contenido, medios, correo y reservas. Registrar hora, versiones y rollback.
8. **Cerrar tras 7–14 días estables.** La observación comienza después del cambio
   validado, no al preparar esta rama. Solo entonces coordinar con Pedro el
   apagado de sus servicios, rotar secretos y retirar accesos. Conservar backups
   y verificar que ya no se solicita contenido ni imágenes a los servicios antiguos.

## Referencias técnicas

- [Payload: adaptadores de almacenamiento, incluido R2](https://payloadcms.com/docs/upload/storage-adapters)
- [Cloudflare: Next.js en Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare: OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [Cloudflare: Hyperdrive](https://developers.cloudflare.com/hyperdrive/get-started/)

Estas referencias orientan la adaptación; no sustituyen una prueba con el
repositorio y la base de datos reales del CMS.

## Validación de la preparación

- 18 pruebas del CMS y configuración superadas con `tsx@4.20.6`.
- `tsc --noEmit`, lint del módulo nuevo y `git diff --check` correctos.
- Build `cloudflare-module` correcto con el origen anterior y con
  `https://cms.volumeslab.com`; valor configurado comprobado en bundles del
  navegador y del servidor.
- PR en borrador: https://github.com/PedroVader/VolumesLab/pull/4.
- Estos resultados verifican el código de preparación, no el CMS migrado ni el
  despliegue en producción.
