"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import styles from "./page.module.css";

export default function Ranking() {
  const [jugadores, setJugadores] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const router = useRouter();

  useEffect(() => {
    cargarRanking();
    cargarNombreUsuario();
  }, []);

  async function cargarNombreUsuario() {
    const idLogged = localStorage.getItem("idLogged");

    if (!idLogged) {
      router.push("/");
      return;
    }

    try {
      const response = await fetch(`http://localhost:4001/Jugadores`, {
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

  async function cargarRanking() {
    try {
      const response = await fetch("http://localhost:4001/Ranking", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (result.jugadores) {
        setJugadores(result.jugadores);
      }
    } catch (error) {
      console.error("Error al obtener ranking:", error);
    }
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

      {/* Tabla de Ranking */}
      <div className={styles.rankingTable}>
        <h2 className={styles.rankingTitle}>Ranking</h2>
        
        {/* Headers */}
        <div className={styles.tableHeaders}>
          <div className={`${styles.headerCell} ${styles.jugadorCol}`}>Jugador</div>
          <div className={styles.headerCell}>Partidas jugadas</div>
          <div className={styles.headerCell}>Partidas ganadas</div>
          <div className={styles.headerCell}>Partidas perdidas</div>
          <div className={styles.headerCell}>Puntos</div>
        </div>

        {/* Filas de jugadores */}
        <div className={styles.tableBody}>
          {jugadores.length > 0 ? (
            jugadores.map((jugador) => (
              <div key={jugador.idusuario} className={styles.tableRow}>
                <div className={`${styles.cell} ${styles.jugadorCol}`}>
                  <div className={styles.avatarSmall}>
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                      <circle cx="15" cy="15" r="15" fill="white"/>
                      <circle cx="15" cy="11" r="4" fill="#4a9eb5"/>
                      <path d="M6 24C6 20 10 17 15 17C20 17 24 20 24 24" fill="#4a9eb5"/>
                    </svg>
                  </div>
                  <span className={styles.jugadorNombre}>{jugador.nombre}</span>
                </div>
                <div className={styles.cell}>
                  <div className={styles.statBadge}>{jugador.partidas_jugadas}</div>
                </div>
                <div className={styles.cell}>
                  <div className={styles.statBadge}>{jugador.partidas_ganadas}</div>
                </div>
                <div className={styles.cell}>
                  <div className={styles.statBadge}>{jugador.partidas_perdidas}</div>
                </div>
                <div className={styles.cell}>
                  <div className={styles.statBadge}>{jugador.puntos}</div>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.noData}>No hay jugadores registrados</p>
          )}
        </div>
      </div>

      {/* Botones inferiores */}
      <div className={styles.bottomButtons}>
        <Button
          texto="HISTORIAL"
          className={styles.buttonYellow}
          onClick={() => router.push("/historial")}
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