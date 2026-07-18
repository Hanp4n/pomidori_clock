import { useContext } from "react";
import { ConnectivityContext } from "./ConnectivityContext";

export const useIsOnline = () => useContext(ConnectivityContext);