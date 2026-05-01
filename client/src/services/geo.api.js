import axiosClient from "../config/axios";

export const geoAutocompleteApi = ({ input = "" } = {}) => {
  return axiosClient.get("/geo/autocomplete", {
    params: { input: input || "" },
  });
};

export const geoReverseApi = ({ lat, lon } = {}) => {
  return axiosClient.get("/geo/reverse", {
    params: { lat, lon },
  });
};
