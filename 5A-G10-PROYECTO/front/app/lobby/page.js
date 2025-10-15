"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import styles from "./page.module.css";

export default function Amigos() {
  const [amigos, setAmigos] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const router = useRouter();

  useEffect(() => {
    cargarAmigos();
    cargarNombreUsuario();
  }, []);

  async function cargarNombreUsuario() {
    const idLogged = localStorage.getItem("idLogged");
    
    if (!idLogged) {
      router.push("/");
      return;
    }

    try {
      const response = await fetch(`http://localhost:4001/Jugadores?idusuario=${idLogged}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const result = await response.json();
      if (result.jugadores && result.jugadores.length > 0) {
        setNombreUsuario(result.jugadores[0].nombre);
      }
    } catch (error) {
      console.error("Error al obtener nombre:", error);
    }
  }

  async function cargarAmigos() {
    const idLogged = localStorage.getItem("idLogged");
    
    if (!idLogged) {
      router.push("/registroYlogin");
      return;
    }

    try {
      const response = await fetch(`http://localhost:4001/Amigos?idjugador=${idLogged}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const result = await response.json();
      console.log(result);

      if (result.amigos && result.amigos.length > 0) {
        setAmigos(result.amigos);
      }
    } catch (error) {
      console.error("Error al obtener amigos:", error);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>¡Hola, {nombreUsuario}!</span>
        </div>
      </div>

      {/* Tabla de amigos */}
      <div className={styles.amigosTable}>
        <div className={styles.tableHeader}>
          <h2>Amigos en línea...</h2>
          <button className={styles.addButton}>+</button>
        </div>

        <div className={styles.amigosList}>
          {amigos.length > 0 ? (
            amigos.map((amigo) => (
              <div key={amigo.idusuario} className={styles.amigoItem}>
                <div className={styles.amigoInfo}>
                  <span className={styles.amigoNombre}>{amigo.nombre}</span>
                </div>
                <Button 
                  texto="JUGAR"
                  className={styles.jugarButton}
                />
              </div>
            ))
          ) : (
            <p className={styles.noAmigos}>No tienes amigos agregados</p>
          )}
        </div>
      </div>

      {/* Botones inferiores */}
      <div className={styles.bottomButtons}>
        <Button 
          texto="RANKING"
          className={styles.buttonPink}
          onClick={() => router.push("/ranking")}
        />
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
            router.push("/");
          }}
        />
      </div>
    </div>
  );
}