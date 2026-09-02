/**
 * Partner application entry page (/partners/:type/apply).
 * Validates the type param, checks auth, renders the multi-step form.
 */
import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"

import PartnerApplicationForm from "@/components/partner/PartnerApplicationForm"
import { getPartnerFormConfig, type PartnerType } from "@/components/partner/partnerFormConfig"
import { useAuthUser } from "@/hooks/useAuthUser"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import "./PartnerApplyPage.css"

const VALID_TYPES: PartnerType[] = [
  "tour-operators",
  "hotels",
  "travel-agents",
  "content-creators",
  "transport-providers",
]

interface PartnerApplyPageProps {
  onOpenAuth?: (mode: "signin" | "signup") => void
}

export default function PartnerApplyPage({ onOpenAuth }: PartnerApplyPageProps) {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const user = useAuthUser()

  const partnerType = type as PartnerType | undefined
  const isValidType = partnerType && VALID_TYPES.includes(partnerType)
  const config = isValidType ? getPartnerFormConfig(partnerType) : null

  useEffect(() => {
    if (config) {
      document.title = `${config.title} | Expedition-Go Tours`
    }
  }, [config])

  if (!isValidType || !config) {
    return (
      <div className="partner-apply-page">
        <Navbar />
        <div className="partner-apply-container">
          <div className="partner-apply-card">
            <h2>Invalid Partner Type</h2>
            <p>The partner type "{type}" is not recognised.</p>
            <button onClick={() => navigate("/partnerships")} className="partner-apply-back-btn">
              Back to Partnerships
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="partner-apply-page">
      <Navbar />
      <div className="partner-apply-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="partner-apply-wrapper"
        >
          {!user ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/partnerships")}
                className="partner-apply-back"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="partner-apply-auth-prompt">
                <h2>Sign up to apply</h2>
                <p>You need to be signed up to submit a partner application.</p>
                <button
                  type="button"
                  onClick={() => onOpenAuth?.("signup")}
                  className="partner-apply-auth-btn"
                >
                  Sign Up
                </button>
                <p className="partner-apply-auth-alt">
                  Already have an account?{" "}
                  <button type="button" onClick={() => onOpenAuth?.("signin")}>
                    Sign in here
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Mobile/tablet back button — on desktop the form renders its own
                  back button on the same row as the step progress bar */}
              <button
                type="button"
                onClick={() => navigate("/partnerships")}
                className="partner-apply-back partner-apply-back--page"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <PartnerApplicationForm
                partnerType={partnerType}
                config={config}
                onBack={() => navigate("/partnerships")}
              />
            </>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}
