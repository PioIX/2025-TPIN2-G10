"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import Input from "../components/Input";
import styles from "./page.module.css";

export default function RegistroYLogin() {
  const [modo, setModo] = useState("login");
  const [nombre, setNombre] = useState("");
  const [mail, setMail] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const router = useRouter();

  const showModal = (title, message) => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

  async function ingresar() {
    if (!mail || !contraseña) {
      showModal("Error", "Por favor completa todos los campos");
      return;
    }

    const datosLogin = {
      mail: mail,
      contraseña: contraseña,
    };

    try {
      const response = await fetch("http://localhost:4001/LoginJugadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosLogin),
      });

      const result = await response.json();
      console.log(result);

      if (result.loguea) {
        showModal("Éxito", "¡Has iniciado sesión correctamente!");
        localStorage.setItem("idLogged", result.idLogged);
        router.push("/lobby")
        if (result.administrador) {
          router.push("/admin");
        }
      } else {
        showModal("Error", result.res || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor.");
    }
  }

  async function registrar() {
    if (!nombre || !mail || !contraseña) {
      showModal("Error", "Por favor completa todos los campos");
      return;
    }

    if (contraseña !== confirmPassword) {
      showModal("Error", "Las contraseñas no coinciden");
      return;
    }

    const datosRegistro = {
      nombre: nombre,
      mail: mail,
      contraseña: contraseña,
      administrador: false,
    };

    console.log(datosRegistro);

    try {
      const response = await fetch("http://localhost:4001/RegistroJugadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosRegistro),
      });

      const result = await response.json();
      console.log(result);

      if (result.registro) {
        showModal("Éxito", "¡Usuario registrado correctamente!");
        localStorage.setItem("idLogged", result.idLogged);
        setTimeout(() => {
          setModo("login");
          setNombre("");
          setMail("");
          setContraseña("");
          setConfirmPassword("");
        }, 1500);
      } else {
        showModal("Error", result.res || "No se pudo registrar el usuario");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor.");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        {/* Logo/Imagen Ingresar */}
        <div className={styles.logoContainer}>
          <img 
            src="/ingresar.png" 
            alt="Ingresar"
            className={styles.logo}
          />
        </div>

        {modo === "login" ? (
          <div className={styles.inputsContainer}>
            <Input
              type="email"
              placeholder="Mail"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              className={styles.input}
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              className={styles.input}
            />
            
            <div className={styles.buttonsContainer}>
              <Button 
                texto="INICIAR SESIÓN"
                onClick={ingresar}
                className={styles.buttonPrimary}
              />
              <Button 
                texto="REGISTRARSE"
                onClick={() => setModo("registro")}
                className={styles.buttonSecondary}
              />
            </div>
          </div>
        ) : (
          <div className={styles.inputsContainer}>
            <Input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={styles.input}
            />
            <Input
              type="email"
              placeholder="Mail"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              className={styles.input}
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              className={styles.input}
            />
            <Input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
            />
            
            <div className={styles.buttonsContainer}>
              <Button 
                texto="REGISTRARSE"
                onClick={registrar}
                className={styles.buttonPrimary}
              />
              <Button 
                texto="INICIAR SESIÓN"
                onClick={() => setModo("login")}
                className={styles.buttonSecondary}
              />
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{modal.title}</h2>
            <p className={styles.modalMessage}>{modal.message}</p>
            <Button
              texto="Cerrar"
              onClick={closeModal}
              className={styles.modalButton}
            />
          </div>
        </div>
      )}
    </div>
  );
}