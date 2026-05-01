import { useEffect, useState } from "react";

export const useResultsAnimKey = (loading, dataVersion) => {
  const [resultsAnimKey, setResultsAnimKey] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!dataVersion) return;
    setResultsAnimKey((k) => k + 1);
  }, [loading, dataVersion]);

  return resultsAnimKey;
};
