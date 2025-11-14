const useConnection = () => {
  const ip = "192.168.0.8";
  const port = "4001";

  const url = `http://${ip}:${port}`;

  return { url };
};

export { useConnection };
