"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { enrollmentsApi } from "@/lib/api";
import { CourseCard } from "@/components/course-card";
import type { Enrollment } from "@/lib/types";

export default function MyLearningPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?next=%2Fmy-learning");
  }, [authLoading, user, router]);

  const load = useCallback(() => {
    if (!token) return;
    enrollmentsApi
      .mine(token)
      .then(setEnrollments)
      .catch(() => setEnrollments([]));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || !user || enrollments === null) {
    return <div className="max-w-[1240px] mx-auto px-6 py-16 text-gw-text-muted">Loading…</div>;
  }

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-10">
      <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint">
        Your courses
      </div>
      <h1 className="font-serif text-[36px] tracking-tight leading-tight mt-1.5">My learning</h1>
      <p className="mt-2 text-[14px] text-gw-text-muted">
        {enrollments.length === 0
          ? "Courses you enroll in will show up here."
          : `${enrollments.length} course${enrollments.length === 1 ? "" : "s"} enrolled.`}
      </p>

      {enrollments.length === 0 ? (
        <div className="mt-8 border border-dashed border-gw-border rounded-2xl bg-gw-surface p-14 text-center">
          <p className="font-serif text-lg text-gw-text-muted max-w-[42ch] mx-auto">
            You haven&apos;t enrolled in anything yet. Find something worth your next few hours.
          </p>
          <Link
            href="/courses"
            className="inline-block mt-5 h-11 px-5 leading-[44px] rounded-[10px] bg-gw-primary text-white text-sm font-medium no-underline hover:no-underline hover:bg-gw-primary-hover"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id}>
              <CourseCard product={enrollment.product} />
              <div className="mt-2 font-mono text-[10px] tracking-wide uppercase text-gw-text-faint">
                Enrolled{" "}
                {new Date(enrollment.created_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
