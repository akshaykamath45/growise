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
    return <div className="mx-auto max-w-[1240px] px-4 py-12 text-gw-text-muted sm:px-6 sm:py-16">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-7 sm:px-6 sm:py-10">
      <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint">
        Your courses
      </div>
      <h1 className="mt-1.5 font-serif text-[32px] leading-tight tracking-tight sm:text-[36px]">My learning</h1>
      <p className="mt-2 text-[14px] text-gw-text-muted">
        {enrollments.length === 0
          ? "Courses you enroll in will show up here."
          : `${enrollments.length} course${enrollments.length === 1 ? "" : "s"} enrolled.`}
      </p>

      {enrollments.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-dashed border-gw-border bg-gw-surface p-7 text-center sm:mt-8 sm:p-14">
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
        <div className="mt-7 grid grid-cols-1 gap-5 sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
