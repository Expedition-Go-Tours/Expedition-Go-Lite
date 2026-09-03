/**
 * Supplier application entry page (/supplier/register).
 * Signed-out users are prompted to sign in first. Signed-in users without an
 * existing application see the multi-step SupplierApplicationForm. Users who
 * already applied see their application status.
 *
 * Supplier status is fetched through the shared useSupplierStatus() hook (the
 * single source of truth also used by Navbar) so a page visit fires ONE
 * status request instead of several independent ones.
 */
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, LoaderCircle, ShieldCheck } from "lucide-react"

import { SupplierApplicationForm } from "@/components/supplier/SupplierApplicationForm"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useSupplierStatus, supplierStatusKey } from "@/hooks/useSupplierStatus"
import { getSupplierPortalUrl, isApprovedSupplier } from "@/lib/supplier"
import { useQueryClient } from "@tanstack/react-query"
import { getAuthUserId } from "@/lib/auth"
import { Button } from "@/components/ui/button"

interface SupplierRegisterPageProps {
  onOpenAuth?: (mode: "signin" | "signup") => void
}

export default function SupplierRegisterPage({ onOpenAuth }: SupplierRegisterPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthUser()
  const { profile, isLoading } = useSupplierStatus({ forceEnabled: true })
  const [redirecting, setRedirecting] = useState(false)

  const userId = getAuthUserId(user)

  // Invalidate cached status after a fresh application so the page flips to
  // the "submitted" state once the profile exists.
  const refreshStatus = () => {
    void queryClient.invalidateQueries({ queryKey: supplierStatusKey(userId) })
  }

  // Already-approved suppliers skip this page and go straight to the
  // TravioAfrica-Supplier platform to log in securely. profile comes from the
  // shared cache, so no extra status request is fired here.
  useEffect(() => {
    if (!profile || !isApprovedSupplier(profile.status)) return
    let cancelled = false
    ;(async () => {
      const portalUrl = await getSupplierPortalUrl(profile)
      if (cancelled || !portalUrl) return
      setRedirecting(true)
      window.location.replace(portalUrl)
    })()
    return () => {
      cancelled = true
    }
  }, [profile])

  const application = profile

  // "Sign in here" — verified suppliers go straight to their dashboard login
  // (SSO into the TravioAfrica-Supplier platform). Anyone else falls back to
  // the normal sign-in prompt.
  const handleSignInHere = async () => {
    if (application && isApprovedSupplier(application.status)) {
      const portalUrl = await getSupplierPortalUrl(application)
      if (portalUrl) {
        window.location.replace(portalUrl)
        return
      }
    }
    onOpenAuth?.("signin")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative min-h-screen bg-white px-4 py-10 sm:py-16"
    >
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            navigate(-1)
          } else {
            navigate("/partnerships")
          }
        }}
        className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 sm:left-6 sm:top-6"
        aria-label={t("common.back", "Back")}
      >
        <ArrowLeft size={18} />
      </button>

      <div className="mx-auto w-full max-w-[720px]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t("supplierAuth.registerTitle", "Join as a Supplier")}
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            {t(
              "supplierAuth.registerDesc",
              "Complete your supplier application to list tours, reach travellers across Africa, and manage bookings from one dashboard."
            )}
          </p>
        </div>

        {(isLoading || redirecting) && !application ? (
          <div className="flex items-center justify-center py-24">
            <LoaderCircle className="size-6 animate-spin text-primary" />
            {redirecting && (
              <span className="ml-3 text-sm text-slate-500">
                {t("supplierAuth.redirectingToPortal", "Taking you to your supplier dashboard…")}
              </span>
            )}
          </div>
        ) : !user ? (
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 size-10 text-primary" />
            <h2 className="text-lg font-bold text-slate-900">
              {t("supplierAuth.signUpToApply", "Sign up to apply")}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {t(
                "supplierAuth.signUpToApplyDesc",
                "You need to be signed up to submit a supplier application."
              )}
            </p>
            <Button
              type="button"
              onClick={() => onOpenAuth?.("signup")}
              className="mt-6 h-12 px-8"
            >
              {t("supplierAuth.signUpButton", "Sign Up")}
            </Button>
          </div>
        ) : application ? (
          <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50 p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 size-10 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {t("supplierAuth.applicationSubmitted", "Application Submitted")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t(
                "supplierAuth.applicationSubmittedDesc",
                "Your supplier application is currently under review. Our team will get back to you within 3-5 business days."
              )}
            </p>
            <p className="mt-3 inline-block rounded-full bg-white px-4 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
              {t("supplierAuth.applicationStatus", "Status")}: {application?.status ?? "PENDING"}
            </p>
          </div>
        ) : (
          <>
            <SupplierApplicationForm onSubmitted={refreshStatus} />
          </>
        )}

        <p className="mt-10 text-center text-sm text-slate-500">
          {t("supplierAuth.alreadyHaveAccount", "Already have a supplier account?")}{" "}
          <button
            type="button"
            onClick={handleSignInHere}
            className="bg-transparent p-0 font-semibold text-primary hover:underline"
          >
            {t("supplierAuth.signInHere", "Sign in here")}
          </button>
        </p>

        <p className="mt-4 text-center text-xs text-slate-400">
          By submitting this application, you agree to our{" "}
          <Link to="/" className="underline hover:text-slate-600">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/" className="underline hover:text-slate-600">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </motion.div>
  )
}
