"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

import Input from "../components/Input";
import Button from "../components/Button";

export default function AdminPage() {
  const router = useRouter();
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [mailJugador, setMailJugador] = useState("");
  const [nombreCategoria, setNombreCategoria] = useState("");
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [categoriaParaPalabra, setCategoriaParaPalabra] = useState("");
  const [palabraEliminar, setPalabraEliminar] = useState("");

  const showModal = (title, message) => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };
  const borrarJugador = async () => {
    if (!mailJugador) {
      showModal("Error", "Por favor ingresa el mail del jugador");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/BorrarJugador", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail: mailJugador }),
      });

      const result = await response.json();

      if (result.success) {
        showModal("Éxito", "Jugador eliminado correctamente");
        setMailJugador("");
      } else {
        showModal("Error", result.message || "No se pudo eliminar el jugador");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor");
    }
  };

  // Función para eliminar categoría
  const eliminarCategoria = async () => {
    if (!nombreCategoria) {
      showModal("Error", "Por favor ingresa el nombre de la categoría");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/EliminarCategoria", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreCategoria }),
      });

      const result = await response.json();

      if (result.success) {
        showModal("Éxito", "Categoría eliminada correctamente");
        setNombreCategoria("");
      } else {
        showModal("Error", result.message || "No se pudo eliminar la categoría");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor");
    }
  };

  // Función para agregar palabra
  const agregarPalabra = async () => {
    if (!nuevaPalabra || !categoriaParaPalabra) {
      showModal("Error", "Por favor completa todos los campos");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/AgregarPalabra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          palabra: nuevaPalabra,
          categoria: categoriaParaPalabra,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showModal("Éxito", "Palabra agregada correctamente");
        setNuevaPalabra("");
        setCategoriaParaPalabra("");
      } else {
        showModal("Error", result.message || "No se pudo agregar la palabra");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor");
    }
  };

  // Función para eliminar palabra
  const eliminarPalabra = async () => {
    if (!palabraEliminar) {
      showModal("Error", "Por favor ingresa la palabra a eliminar");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/BorrarPalabra", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palabra: palabraEliminar }),
      });

      const result = await response.json();

      if (result.success) {
        showModal("Éxito", "Palabra eliminada de todas las categorías");
        setPalabraEliminar("");
      } else {
        showModal("Error", result.message || "No se pudo eliminar la palabra");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <img src="/ingresar.png" alt="Panel Admin" className={styles.logo} />
        <h2 className={styles.subtitle}>¡Hola administrador!</h2>

        <Input
          type="email"
          placeholder="Mail del jugador a eliminar"
          value={mailJugador}
          onChange={(e) => setMailJugador(e.target.value)}
          className={styles.input}
        />
        <Button onClick={borrarJugador} className={styles.button}>
          ELIMINAR JUGADOR
        </Button>

        <Input
          placeholder="Nombre de categoría a eliminar"
          value={nombreCategoria}
          onChange={(e) => setNombreCategoria(e.target.value)}
          className={styles.input}
        />
        <Button onClick={eliminarCategoria} className={styles.button}>
          ELIMINAR CATEGORÍA
        </Button>

        <Input
          placeholder="Nueva palabra"
          value={nuevaPalabra}
          onChange={(e) => setNuevaPalabra(e.target.value)}
          className={styles.input}
        />
        <Input
          placeholder="Categoría para la palabra"
          value={categoriaParaPalabra}
          onChange={(e) => setCategoriaParaPalabra(e.target.value)}
          className={styles.input}
        />
        <Button onClick={agregarPalabra} className={styles.button}>
          AGREGAR PALABRA
        </Button>

        <Input
          placeholder="Palabra a eliminar"
          value={palabraEliminar}
          onChange={(e) => setPalabraEliminar(e.target.value)}
          className={styles.input}
        />
        <Button onClick={eliminarPalabra} className={styles.button}>
          ELIMINAR PALABRA
        </Button>

        <div className={styles.buttonGroup}>
          <Button onClick={() => router.push("/lobby")} className={styles.buttonSecondary}>
            LOBBY
          </Button>
          <Button onClick={() => router.push("/ranking")} className={styles.buttonSecondary}>
            VER RANKING
          </Button>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{modal.title}</h2>
            <p className={styles.modalMessage}>{modal.message}</p>
            <Button onClick={closeModal} className={styles.modalButton}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}