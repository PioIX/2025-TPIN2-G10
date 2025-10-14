"use client"
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '../components/Button';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const irAOtraPagina = () => {
    router.push("/registroYlogin");
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Image 
          src="/tuttifrutti.png" 
          alt="Tutti Frutti"
          width={400}
          height={200}
          priority
          className={styles.logo}
        />
        <Button 
          texto="INGRESAR"
          onClick={irAOtraPagina}
          className={styles.button}
        />
      </div>
    </div>
  )
}