"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import styles from "./page.module.css";
import { useConnection } from "../../hook/useConnection";

export default function Historial() {
  const [historial, setHistorial] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { url } = useConnection();

  useEffect(() => {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) {
      router.push("/registroYlogin");
      return;
    }
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const idLogged = localStorage.getItem("idLogged");
    
    try {
      setLoading(true);

      const responseJugador = await fetch(`${url}/Jugadores?idusuario=${idLogged}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const resultJugador = await responseJugador.json();

      if (resultJugador.jugadores && resultJugador.jugadores.length > 0) {
        setNombreUsuario(resultJugador.jugadores[0].nombre);
      }

      const responseHistorial = await fetch(`${url}/HistorialPartidas?idjugador=${idLogged}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const resultHistorial = await responseHistorial.json();

      if (resultHistorial.historial) {
        setHistorial(resultHistorial.historial);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";
    const date = new Date(fecha);
    const dia = date.getDate().toString().padStart(2, "0");
    const mes = (date.getMonth() + 1).toString().padStart(2, "0");
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <div className={styles.avatarCircle}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="white" opacity="0.3" />
              <circle cx="20" cy="15" r="6" fill="white" />
              <path d="M8 32C8 26 13 22 20 22C27 22 32 26 32 32" fill="white" />
            </svg>
          </div>
          <span className={styles.userName}>
            Historial de <span className={styles.nombreDestacado}>{nombreUsuario}</span>
          </span>
        </div>
      </div>

      <div className={styles.rankingTable}>
        <h2 className={styles.rankingTitle}>Historial de Partidas</h2>

        {loading ? (
          <p className={styles.noData}>Cargando...</p>
        ) : historial.length > 0 ? (
          <>
            <div className={styles.tableHeaders}>
              <div className={styles.headerCell}>Fecha</div>
              <div className={styles.headerCell}>Oponente</div>
              <div className={styles.headerCell}>Resultado</div>
              <div className={styles.headerCell}>Ganador</div>
              <div className={styles.headerCell}>Puntos</div>
            </div>

            <div className={styles.tableBody}>
              {historial.map((partida, index) => (
                <div key={partida.idhistorial || index} className={styles.tableRow}>
                  <div className={styles.cell}>
                    <span>{formatearFecha(partida.fecha)}</span>
                  </div>

                  <div className={`${styles.cell} ${styles.jugadorCol}`}>
                    <div className={styles.avatarSmall}>
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                        <circle cx="15" cy="15" r="15" fill="white" />
                        <circle cx="15" cy="11" r="4" fill="#4a9eb5" />
                        <path d="M6 24C6 20 10 17 15 17C20 17 24 20 24 24" fill="#4a9eb5" />
                      </svg>
                    </div>
                    <span className={styles.jugadorNombre}>{partida.oponente}</span>
                  </div>

                  <div className={styles.cell}>
                    <span className={styles.statBadge}>
                      {partida.empate ? "EMPATE" : partida.gano ? "VICTORIA" : "DERROTA"}
                    </span>
                  </div>

                  <div className={styles.cell}>
                    <span>{partida.empate ? "Empate" : partida.ganador}</span>
                  </div>

                  <div className={styles.cell}>
                    <span className={styles.statBadge}>
                      {partida.empate 
                        ? partida.puntos
                        : partida.gano 
                        ? `+${partida.puntos}` 
                        : "0"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.noData}>
            <p>No hay partidas jugadas todavia</p>
          </div>
        )}
      </div>

      <div className={styles.bottomButtons}>
        <Button
          texto="LOBBY"
          className={styles.buttonGreen}
          onClick={() => router.push("/lobby")}
        />
        <Button
          texto="RANKING"
          className={styles.buttonYellow}
          onClick={() => router.push("/ranking")}
        />
        <Button
          texto="CERRAR SESION"
          className={styles.buttonRed}
          onClick={() => {
            localStorage.removeItem("idLogged");
            router.push("/registroYlogin");
          }}
        />
      </div>
    </div>
  );
}