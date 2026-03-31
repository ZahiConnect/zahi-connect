import api from "../../lib/axios";

const request = async (config) => {
  const response = await api({
    ...config,
    skipLoading: true,
  });
  return response.data;
};

const normalizeCollection = (payload) => payload?.data ?? payload?.docs ?? payload ?? [];

const dbs = {
  addCollection: (name) =>
    request({
      method: "POST",
      url: `/hotel/collections/${name}`,
    }),

  readCollection: async (name, limit = 100) =>
    normalizeCollection(
      await request({
        method: "GET",
        url: `/hotel/collections/${name}`,
        params: { limit },
      })
    ),

  deleteCollection: (name) =>
    request({
      method: "DELETE",
      url: `/hotel/collections/${name}`,
    }),

  addAutoIdDocument: (collection, data) =>
    request({
      method: "POST",
      url: `/hotel/doc/${collection}`,
      data,
    }),

  addDocument: (collection, docId, data) =>
    request({
      method: "POST",
      url: `/hotel/doc/${collection}/${docId}`,
      data,
    }),

  readDocument: async (collection, docId) => {
    try {
      return await request({
        method: "GET",
        url: `/hotel/doc/${collection}/${docId}`,
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
      url: `/hotel/doc/${collection}/${docId}`,
      data,
    }),

  deleteDocument: (collection, docId) =>
    request({
      method: "DELETE",
      url: `/hotel/doc/${collection}/${docId}`,
    }),

  whereCollection: async (collection, field, operator, value, limit = 100) =>
    normalizeCollection(
      await request({
        method: "POST",
        url: `/hotel/query/${collection}`,
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
        url: `/hotel/query/${collection}`,
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
        url: `/hotel/query/${collection}`,
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
        url: `/hotel/query/${collection}`,
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
      url: "/hotel/images/upload",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default dbs;
