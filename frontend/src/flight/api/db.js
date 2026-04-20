import api from "../../lib/axios";

const request = async (config) => {
  const response = await api({
    ...config,
    skipLoading: true,
  });

  const contentType = response.headers?.["content-type"] || "";
  const payload = response.data;
  if (
    typeof payload === "string" &&
    (contentType.includes("text/html") || payload.trimStart().startsWith("<!doctype html"))
  ) {
    throw new Error(
      "Flight API request returned frontend HTML instead of JSON. Check the /flight proxy or gateway."
    );
  }
  return payload;
};

const normalizeCollection = (payload) => payload?.data ?? payload?.docs ?? payload ?? [];

const dbs = {
  addCollection: (name) =>
    request({
      method: "POST",
      url: `/flight/collections/${name}`,
    }),

  readCollection: async (name, limit = 100) =>
    normalizeCollection(
      await request({
        method: "GET",
        url: `/flight/collections/${name}`,
        params: { limit },
      })
    ),

  deleteCollection: (name) =>
    request({
      method: "DELETE",
      url: `/flight/collections/${name}`,
    }),

  addAutoIdDocument: (collection, data) =>
    request({
      method: "POST",
      url: `/flight/doc/${collection}`,
      data,
    }),

  addDocument: (collection, docId, data) =>
    request({
      method: "POST",
      url: `/flight/doc/${collection}/${docId}`,
      data,
    }),

  readDocument: async (collection, docId) => {
    try {
      return await request({
        method: "GET",
        url: `/flight/doc/${collection}/${docId}`,
      });
    } catch (error) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  editDocument: (collection, docId, data) =>
    request({
      method: "PATCH",
      url: `/flight/doc/${collection}/${docId}`,
      data,
    }),

  deleteDocument: (collection, docId) =>
    request({
      method: "DELETE",
      url: `/flight/doc/${collection}/${docId}`,
    }),

  whereCollection: async (collection, field, operator, value, limit = 100) =>
    normalizeCollection(
      await request({
        method: "POST",
        url: `/flight/query/${collection}`,
        data: {
          filters: [{ field, operator, value }],
          limit,
        },
      })
    ),

  sortCollection: async (collection, field, direction = "ASC", limit = 100) =>
    normalizeCollection(
      await request({
        method: "POST",
        url: `/flight/query/${collection}`,
        data: {
          sort_field: field,
          sort_direction: direction,
          limit,
        },
      })
    ),

  whereAndSortCollection: async (
    collection,
    fieldW,
    operator,
    valueW,
    fieldS,
    direction = "ASC",
    limit = 100
  ) =>
    normalizeCollection(
      await request({
        method: "POST",
        url: `/flight/query/${collection}`,
        data: {
          filters: [{ field: fieldW, operator, value: valueW }],
          sort_field: fieldS,
          sort_direction: direction,
          limit,
        },
      })
    ),

  query: async (collection, filters = [], sortField = null, sortDirection = "ASC", limit = 100) =>
    normalizeCollection(
      await request({
        method: "POST",
        url: `/flight/query/${collection}`,
        data: {
          filters,
          sort_field: sortField,
          sort_direction: sortDirection,
          limit,
        },
      })
    ),

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return request({
      method: "POST",
      url: "/flight/images/upload",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default dbs;
