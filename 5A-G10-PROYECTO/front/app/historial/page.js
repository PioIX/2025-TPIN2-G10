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
    cargarHistorial();
    cargarNombreUsuario();
  }, []);

  async function cargarNombreUsuario() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) {
      router.push("/");
      return;
    }

    try {
      const response = await fetch(`${url}/Jugadores`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      
      if (result.jugadores && result.jugadores.length > 0) {
        const jugadorActual = result.jugadores.find(
          (j) => j.idusuario == idLogged
        );
        if (jugadorActual) {
          setNombreUsuario(jugadorActual.nombre);
        }
      }
    } catch (error) {
      console.error("Error al obtener nombre:", error);
    }
  }

  async function cargarHistorial() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) {
      router.push("/");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${url}/HistorialPartidas?idjugador=${idLogged}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const result = await response.json();
      
      if (result.historial) {
        setHistorial(result.historial);
      }
    } catch (error) {
      console.error("Error al obtener historial:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${año} ${hora}:${minutos}`;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <div className={styles.avatarCircle}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="white" opacity="0.3"/>
              <circle cx="20" cy="15" r="6" fill="white"/>
              <path d="M8 32C8 26 13 22 20 22C27 22 32 26 32 32" fill="white"/>
            </svg>
          </div>
          <span className={styles.userName}>
            ¡Hola! <span className={styles.nombreDestacado}>{nombreUsuario}</span>
          </span>
        </div>
      </div>

      {/* Tabla de Historial */}
      <div className={styles.historialTable}>
        <h2 className={styles.historialTitle}>Historial de Partidas</h2>
        
        {loading ? (
          <p className={styles.loading}>Cargando...</p>
        ) : historial.length > 0 ? (
          <>
            {/* Headers */}
            <div className={styles.tableHeaders}>
              <div className={`${styles.headerCell} ${styles.fechaCol}`}>Fecha</div>
              <div className={styles.headerCell}>Oponente</div>
              <div className={styles.headerCell}>Ganador</div>
              <div className={styles.headerCell}>Resultado</div>
              <div className={styles.headerCell}>Puntos</div>
            </div>

            {/* Filas de historial */}
            <div className={styles.tableBody}>
              {historial.map((partida) => (
                <div key={partida.idhistorial} className={styles.tableRow}>
                  <div className={`${styles.cell} ${styles.fechaCol}`}>
                    <span className={styles.fechaTexto}>
                      {formatearFecha(partida.fecha)}
                    </span>
                  </div>
                  
                  <div className={styles.cell}>
                    <div className={styles.oponenteInfo}>
                      <div className={styles.avatarSmall}>
                        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                          <circle cx="15" cy="15" r="15" fill="white"/>
                          <circle cx="15" cy="11" r="4" fill="#4a9eb5"/>
                          <path d="M6 24C6 20 10 17 15 17C20 17 24 20 24 24" fill="#4a9eb5"/>
                        </svg>
                      </div>
                      <span className={styles.oponenteNombre}>{partida.oponente}</span>
                    </div>
                  </div>
                  
                  <div className={styles.cell}>
                    <span className={styles.ganadorTexto}>{partida.ganador}</span>
                  </div>
                  
                  <div className={styles.cell}>
                    <div className={partida.gano ? styles.resultadoVictoria : styles.resultadoDerrota}>
                      {partida.resultado}
                    </div>
                  </div>
                  
                  <div className={styles.cell}>
                    <div className={styles.puntosBadge}>
                      {partida.gano ? `+${partida.puntos}` : '0'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.noData}>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className={styles.emptyIcon}>
              <circle cx="40" cy="40" r="35" stroke="white" strokeWidth="4" opacity="0.3"/>
              <path d="M25 40 L35 50 L55 30" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
            </svg>
            <p className={styles.noDataText}>No hay partidas jugadas...</p>
          </div>
        )}
      </div>

      {/* Botones inferiores */}
      <div className={styles.bottomButtons}>
        <Button
          texto="LOBBY"
          className={styles.buttonGreen}
          onClick={() => router.push("/lobby")}
        />
        <Button
          texto="RANKING"

          className={styles.buttonBlue}
          onClick={() => router.push("/ranking")}
        />
        <Button
          texto="CERRAR SESIÓN"
          className={styles.buttonRed}
          onClick={() => {
            localStorage.removeItem("idLogged");
            router.push("/home");
          }}
        />
      </div>
    </div>
  );
}