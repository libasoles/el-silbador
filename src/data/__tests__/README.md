# Tests de integración de datos

`songs.test.ts` verifica el acceso a datos, Auth y las políticas RLS contra la pila local de
Supabase. No usa el proyecto remoto ni sus claves.

## Requisitos

- Docker Desktop (u otro runtime compatible con Docker) en ejecución.
- Node.js 20 o superior.

## Ejecutar

```sh
npm run test:integration
```

El comando copia la configuración de Supabase a un directorio temporal, inicia una pila con un
proyecto y puertos propios, y ejecuta allí `supabase db reset`. Después ejecuta únicamente esta
suite y elimina esa pila temporal. La base local de desarrollo (la que usa `npm run dev`) no se
toca.

`npm test` sigue ejecutando los tests unitarios sin Docker y deja esta suite saltada. Esto evita
que tests normales puedan tocar por error un proyecto alojado.

## Desarrollo local de la aplicación

Una vez iniciada la pila, ejecutá `supabase status` para ver la URL y la clave anónima local. Si
querés que `npm run dev` o `npm run build` usen la pila local, copiá esos valores a un archivo
`.env.local` ignorado:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-local>
```

La clave `service_role` sólo la usa el script de integración para crear y borrar usuarios de
prueba; nunca debe incluirse en variables `NEXT_PUBLIC_*` ni subirse al repositorio.
