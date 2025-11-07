import { useEffect } from "react";

export const useEquipesWithMatchesTest = () => {
  useEffect(() => {
    const runTest = async () => {
      try {
        await fetch("/api/teams");
      } catch (error) {
        console.error("Error in useEquipesWithMatchesTest:", error);
      }
    };

    runTest();
  }, []);
};
