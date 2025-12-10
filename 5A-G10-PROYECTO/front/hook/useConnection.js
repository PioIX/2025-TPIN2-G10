const useConnection = () => {
  const ip = "10.1.4.148";
  const port = "4001";

  const url = `http://${ip}:${port}`;
  return { url };
};

export { useConnection };
