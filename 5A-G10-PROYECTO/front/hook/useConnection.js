const useConnection = () => {
  const ip = "192.168.0.59";
  const port = "4001";

  const url = `http://${ip}:${port}`;
  return { url };
};

export { useConnection };
