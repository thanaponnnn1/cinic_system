/**
 * คีย์ใน sessionStorage ว่าเห็น splash แล้ว — แยกไฟล์ไว้เพราะ layout (server component)
 * ต้องใช้ค่านี้ในสคริปต์ก่อนวาดหน้า และ import ค่าคงที่จากไฟล์ 'use client' ไม่ได้ค่าจริง
 */
export const SPLASH_SEEN_KEY = 'clinicq_splash_seen';
