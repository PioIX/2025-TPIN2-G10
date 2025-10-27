"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import styles from "./page.module.css";
import { useSocket } from  "@/hook/useSocket";


export default function Amigos() {
  const [amigos, setAmigos] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [solicitudPendiente, setSolicitudPendiente] = useState(null);
  const [idLogged, setIdLogged] = useState(null);
  const [registrado, setRegistrado] = useState(false);
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const id = localStorage.getItem("idLogged");
    if (id) {
      setIdLogged(id);
    }
    cargarAmigos();
    cargarNombreUsuario();
  }, []);

  useEffect(() => {
    if (!socket || !idLogged || !isConnected) return;

    console.log('se esta registrando', idLogged);
    socket.emit('registerUser', idLogged);

    
    socket.on('registrationConfirmed', (data) => {
      console.log('se registro', data);
      setRegistrado(true);
    });

    socket.on('gameRequest', (data) => {
      console.log("recibio la solicitud de juego", data);
      setSolicitudPendiente(data);
    });

  
    socket.on('requestSent', (data) => {
      console.log('se envio la solicitud', data.message);
      alert(data.message);
    });

    socket.on('gameStarted', (data) => {
      console.log("empezo el juego", data);
      alert('¡El juego está comenzando!');
      router.push(`/tuttifrutti?room=${data.room}`);
    });

    socket.on('gameRejected', (data) => {
      alert(data.message);
    });

    socket.on('userOffline', (data) => {
      alert(data.message);
    });

    return () => {
      socket.off('registrationConfirmed');
      socket.off('gameRequest');
      socket.off('requestSent');
      socket.off('gameStarted');
      socket.off('gameRejected');
      socket.off('userOffline');
    };
  }, [socket, idLogged, isConnected]);


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
      console.log("Todos los jugadores:", result);

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

  async function cargarAmigos() {
    const idLogged = localStorage.getItem("idLogged");

    if (!idLogged) {
      router.push("/registroYlogin");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:4001/Amigos?idjugador=${idLogged}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();

      if (result.amigos && result.amigos.length > 0) {
        setAmigos(result.amigos);
      } else {
        setAmigos([]); 
      }
    } catch (error) {
      console.error("Error al obtener amigos:", error);
    }
  }



  async function envioSolicitudJuego (amigo) {
    socket.emit('sendGameRequest', {
      idSolicitante: parseInt(idLogged),
      nombreSolicitante: nombreUsuario,
      idReceptor: parseInt(amigo.idusuario),
      nombreReceptor: amigo.nombre
    });
  }


  function aceptarSolicitud() {
    if (!solicitudPendiente) return;

    socket.emit('acceptGameRequest', {
      idSolicitante: parseInt(solicitudPendiente.idSolicitante),
      idReceptor: parseInt(idLogged)
    });

    setSolicitudPendiente(null);
  }

  
  function rechazarSolicitud() {
    if (!solicitudPendiente) return;

    socket.emit('rejectGameRequest', {
      idSolicitante: parseInt(solicitudPendiente.idSolicitante),
      nombreReceptor: nombreUsuario
    });

    setSolicitudPendiente(null);
  }

  

  async function cargarUsuariosDisponibles() {
    const idLogged = localStorage.getItem("idLogged");

    console.log("Cargando usuarios disponibles para:", idLogged);

    try {
      const response = await fetch(
        `http://localhost:4001/UsuariosDisponibles?idjugador=${idLogged}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();
      console.log("Usuarios disponibles:", result);

      if (result.usuarios) {
        setUsuariosDisponibles(result.usuarios);
      }
    } catch (error) {
      console.error("Error al obtener usuarios disponibles:", error);
    }
  }

  async function agregarAmigo(idamigo) {
    const idLogged = localStorage.getItem("idLogged");

    try {
      const response = await fetch("http://localhost:4001/AgregarAmigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idjugador: idLogged,
          idamigo: idamigo,
        }),
      });

      const result = await response.json();

      if (result.agregado) {
        alert("¡Amigo agregado correctamente!");
        setMostrarModal(false);
        cargarAmigos(); // Recargar lista de amigos
      } else {
        alert(result.res);
      }
    } catch (error) {
      console.error("Error al agregar amigo:", error);
      alert("Error al agregar amigo");
    }
  }

  function abrirModal() {
    console.log("Abriendo modal...");
    setMostrarModal(true);
    cargarUsuariosDisponibles();
  }

  async function eliminarAmigo(idAmigo) {
    const idLogged = localStorage.getItem("idLogged");
    
    if (!confirm("¿Estás seguro de que quieres eliminar este amigo?")) {
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/EliminarAmigo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idjugador: parseInt(idLogged),
          idamigo: parseInt(idAmigo)
        })
      });

      const result = await response.json();
      
      if (result.eliminado) {
        alert(result.res);
        cargarAmigos(); 
      } else {
        alert(result.res || "No se pudo eliminar el amigo");
      }
    } catch (error) {
      console.error("Error al eliminar amigo:", error);
      alert("Error al eliminar amigo");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>
            ¡Hola, <span className={styles.nombreDestacado}>{nombreUsuario}</span>!</span>
        </div>
         <span className={styles.connectionStatus}>
            {isConnected && registrado ? "En linea" : "Desconectado"}
          </span>
      </div>

      <div className={styles.amigosTable}>
        <div className={styles.tableHeader}>
          <h2>Amigos</h2>
          <button
            className={styles.addButton}
            onClick={() => {
              console.log("Click en botón +");
              abrirModal();
            }}
          >
            +
          </button>
        </div>

        <div className={styles.amigosList}>
          {amigos.length > 0 ? (
            amigos.map((amigo) => (
              <div key={amigo.idusuario} className={styles.amigoItem}>
                <div className={styles.amigoInfo}>
                  <span className={styles.amigoNombre}>{amigo.nombre}</span>
                </div>
                <div className={styles.amigoActions}>
                  <Button 
                    texto="JUGAR" 
                    className={styles.jugarButton} 
                    onClick={() => envioSolicitudJuego(amigo)}  //hay que hacer un showmodal que le aparezca al otro para aceptar o rechazar, y q a mi me aparezca un showmodal que diga solicitud pendiente
                  />
                  <Button 
                    texto="ELIMINAR"
                    className={styles.eliminarButton}
                    onClick={() => eliminarAmigo(amigo.idusuario)}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className={styles.noAmigos}>No tienes amigos agregados</p>
          )}
        </div>
      </div>

      {mostrarModal && (
        <>
          {console.log("Renderizando modal, mostrarModal:", mostrarModal)}
          <div
            className={styles.modalOverlay}
            onClick={() => setMostrarModal(false)}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>Agregar Amigo</h3>
                <button
                  className={styles.closeButton}
                  onClick={() => setMostrarModal(false)}
                >
                  ×
                </button>
              </div>

              <div className={styles.usuariosLista}>
                {usuariosDisponibles.length > 0 ? (
                  usuariosDisponibles.map((usuario) => (
                    <div key={usuario.idusuario} className={styles.usuarioItem}>
                      <div className={styles.usuarioInfo}>
                        <span className={styles.usuarioNombre}>
                          {usuario.nombre}
                        </span>
                        <span className={styles.usuarioMail}>
                          {usuario.mail}
                        </span>
                      </div>
                      <button
                        className={styles.btnAgregar}
                        onClick={() => agregarAmigo(usuario.idusuario)}
                      >
                        Agregar
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={styles.noUsuarios}>
                    No hay usuarios disponibles para agregar
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      
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
          router.push("/registroYlogin"); 
          }}
        />
      </div>
    </div>
  );
}