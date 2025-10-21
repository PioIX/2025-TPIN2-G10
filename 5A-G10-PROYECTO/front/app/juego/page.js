"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import styles from "./page.module.css";

export default function TuttiFrutti() {
  const [letra, setLetra] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [tiempoRestante, setTiempoRestante] = useState(120);
  const [juegoActivo, setJuegoActivo] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [todasCategorias, setTodasCategorias] = useState([]);
  const router = useRouter();

  useEffect(() => {
    cargarNombreUsuario();
    cargarCategorias();
    
  }, []);

  useEffect(() => {
    let intervalo;
    if (juegoActivo && tiempoRestante > 0) {
      intervalo = setInterval(() => {
        setTiempoRestante((prev) => prev - 1);
      }, 1000 );
    } else if (tiempoRestante === 0 && juegoActivo) {
      finalizarRonda();
    }
    return () => clearInterval(intervalo);
  }, [juegoActivo, tiempoRestante]);

  async function cargarNombreUsuario() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) {
      router.push("/registroYlogin");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/Jugadores", {
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

  async function cargarCategorias() {
    try {
      const response = await fetch("http://localhost:4001/CategoriaAleatoria", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      console.log(result)
      if (result.categorias && result.categorias.length > 0) {
        await setTodasCategorias(result.categorias);
        
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  }

  function seleccionarCategoriasAleatorias() {
    const cantidadCategorias = Math.min(7, todasCategorias.length);
    const categoriasAleatorias = [];
    const copiaCategorias = [...todasCategorias];

    for (let i = 0; i < cantidadCategorias; i++) {
      const indiceAleatorio = Math.floor(Math.random() * copiaCategorias.length);
      categoriasAleatorias.push(copiaCategorias[indiceAleatorio]);
      copiaCategorias.splice(indiceAleatorio, 1);
    }

    return categoriasAleatorias;
  }
  useEffect(() => {
    if (todasCategorias.length > 0) {
      iniciarJuego();
    }
  }, [todasCategorias]);
  function iniciarJuego() {

    const letrasDisponibles = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const letraAleatoria = letrasDisponibles[Math.floor(Math.random() * letrasDisponibles.length)];

    const categoriasSeleccionadas = seleccionarCategoriasAleatorias();

    setLetra(letraAleatoria);
    setCategorias(categoriasSeleccionadas);
    setRespuestas({});
    setTiempoRestante(120);
    setJuegoActivo(true);
  }

  function handleInputChange(categoria, valor) {
    setRespuestas((prev) => ({
      ...prev,
      [categoria]: valor,
    }));
  }

  function finalizarRonda() {
    setJuegoActivo(false);
    calcularPuntos();
  }

  function calcularPuntos() {
    let puntosRonda = 0;

    Object.entries(respuestas).forEach(([_, respuesta]) => {
      if (respuesta && respuesta.trim() !== "") {
        const primeraLetra = respuesta.trim()[0].toUpperCase();
        if (primeraLetra === letra) {
          puntosRonda += 10;
        } else {
          puntosRonda += 5;
        }
      }
    });

    setPuntos((prev) => prev + puntosRonda);
    alert(`¡Ronda finalizada! Ganaste ${puntosRonda} puntos`);
  }

  async function guardarEstadisticas() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) return;

    try {
      await fetch("http://localhost:4001/ActualizarEstadisticas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          resultado: "ganada",
          puntos: puntos,
        }),
      });
      alert("¡Estadísticas guardadas!");
      router.push("/amigos");
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  }

  return (
    
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.headerCell}>L</th>
            {todasCategorias.map((categoria, index) => (
              <th key={index} className={styles.headerCell}>
                {categoria.nombre || categoria}
              </th>
            ))}
            <th className={styles.headerCell}>Puntos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={styles.letraCell}>
              {letra || '-'}
            </td>
            {todasCategorias.map((categoria, index) => {
              const nombreCategoria = categoria.nombre || categoria;
              return (
                <td key={index} className={styles.inputCell}>
                  <input
                    type="text"
                    value={respuestas[nombreCategoria] || ''}
                    onChange={(e) => onInputChange(nombreCategoria, e.target.value)}
                    disabled={!juegoActivo}
                    placeholder={juegoActivo ? ` ${letra}...` : ''}
                    className={`${styles.input} ${!juegoActivo ? styles.inputDisabled : ''}`}
                  />
                </td>
              );
            })}
            <td className={styles.puntosCell}>-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}