import { accesoConfigurado } from "@/lib/auth";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="entrar">
      <form className="tarjeta-entrar" method="post" action="/api/entrar">
        <p className="etiqueta">Oficina Virtual de Ingeniería</p>
        <h1>Entrar a la oficina</h1>
        {!accesoConfigurado() && (
          <p className="aviso">El acceso no está configurado: faltan OFICINA_USUARIO y OFICINA_CLAVE en el servidor.</p>
        )}
        {error && <p className="aviso">Usuario o clave incorrectos.</p>}
        <label>
          Usuario
          <input name="usuario" autoComplete="username" required />
        </label>
        <label>
          Clave
          <input name="clave" type="password" autoComplete="current-password" required />
        </label>
        <button className="boton-primario" type="submit">Entrar</button>
      </form>
    </main>
  );
}
