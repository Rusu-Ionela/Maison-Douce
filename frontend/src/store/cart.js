import api, { getJson, BASE_URL } from '/src/lib/api.js';
export async function applyCoupon(code, total) {
    const { data } = await api.post("/coupon/apply", { code, total });
    return data; // {discount,newTotal,message}
}

