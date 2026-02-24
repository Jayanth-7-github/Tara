import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundRippleEffect } from "../components/ui/background-ripple-effect";
import {
    FiArrowLeft, FiUser, FiMail, FiMessageSquare, FiBriefcase,
    FiSend, FiCheckCircle, FiAlertCircle, FiPhone, FiMapPin,
    FiLinkedin, FiAward, FiCalendar,
} from "react-icons/fi";
import { sendContact } from "../services/api";

const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 text-white placeholder:text-slate-500";

function Field({ icon: Icon, label, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1">{label}</label>
            <div className="relative group">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                {children}
            </div>
        </div>
    );
}

export default function BecomeOrganizer() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        college: "",
        department: "",
        linkedin: "",
        experience: "",
        eventsPlanned: "",
        reason: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error) setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const message = [
                `Phone: ${formData.phone || "N/A"}`,
                `Department: ${formData.department || "N/A"}`,
                `LinkedIn: ${formData.linkedin || "N/A"}`,
                `Years of Experience: ${formData.experience || "N/A"}`,
                `Events Planned to Host: ${formData.eventsPlanned || "N/A"}`,
                ``,
                `Why I want to be an organizer:`,
                formData.reason,
            ].join("\n");

            await sendContact({
                name: formData.name,
                email: formData.email,
                college: formData.college,
                branch: formData.department,
                message,
                type: "organizer_application",
            });

            setIsSubmitted(true);
            setTimeout(() => navigate("/"), 4000);
        } catch (err) {
            console.error("Submission failed:", err);
            setError(err.message || "Failed to submit application. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-[#020617] text-white flex items-center justify-center px-6 py-16 font-sans overflow-hidden">
            <BackgroundRippleEffect rows={20} cols={40} cellSize={52} />

            <div className="relative z-10 w-full max-w-2xl">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate("/")}
                    className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200"
                >
                    <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Home</span>
                </motion.button>

                <AnimatePresence mode="wait">
                    {!isSubmitted ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white/3 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
                        >
                            {/* Header */}
                            <div className="mb-8 text-center">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                                    <FiAward className="text-blue-400 text-2xl" />
                                </div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                                    Become an Organizer
                                </h1>
                                <p className="text-slate-400 mt-2 text-sm">
                                    Fill in the form below. Our team will review your application and get back to you shortly.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Row 1: Name + Email */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field icon={FiUser} label="Full Name *">
                                        <input required type="text" name="name" value={formData.name}
                                            onChange={handleChange} placeholder="John Doe" className={inputClass} />
                                    </Field>
                                    <Field icon={FiMail} label="Email Address *">
                                        <input required type="email" name="email" value={formData.email}
                                            onChange={handleChange} placeholder="john@college.edu" className={inputClass} />
                                    </Field>
                                </div>

                                {/* Row 2: Phone + College */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field icon={FiPhone} label="Phone Number *">
                                        <input required type="tel" name="phone" value={formData.phone}
                                            onChange={handleChange} placeholder="+91 98765 43210" className={inputClass} />
                                    </Field>
                                    <Field icon={FiMapPin} label="College / Institution *">
                                        <input required type="text" name="college" value={formData.college}
                                            onChange={handleChange} placeholder="IIT Madras" className={inputClass} />
                                    </Field>
                                </div>

                                {/* Row 3: Department + LinkedIn */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field icon={FiBriefcase} label="Department / Branch *">
                                        <input required type="text" name="department" value={formData.department}
                                            onChange={handleChange} placeholder="Computer Science" className={inputClass} />
                                    </Field>
                                    <Field icon={FiLinkedin} label="LinkedIn Profile *">
                                        <input required type="url" name="linkedin" value={formData.linkedin}
                                            onChange={handleChange} placeholder="https://linkedin.com/in/johndoe" className={inputClass} />
                                    </Field>
                                </div>

                                {/* Row 4: Experience + Events Planned */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field icon={FiAward} label="Event Experience (years) *">
                                        <select required name="experience" value={formData.experience}
                                            onChange={handleChange}
                                            className={inputClass + " appearance-none cursor-pointer"}>
                                            <option value="" className="bg-gray-900">Select range</option>
                                            <option value="0" className="bg-gray-900">No prior experience</option>
                                            <option value="less than 1" className="bg-gray-900">Less than 1 year</option>
                                            <option value="1-2" className="bg-gray-900">1–2 years</option>
                                            <option value="3-5" className="bg-gray-900">3–5 years</option>
                                            <option value="5+" className="bg-gray-900">5+ years</option>
                                        </select>
                                    </Field>
                                    <Field icon={FiCalendar} label="Events You Plan to Host *">
                                        <input required type="text" name="eventsPlanned" value={formData.eventsPlanned}
                                            onChange={handleChange} placeholder="Hackathon, Workshop, etc." className={inputClass} />
                                    </Field>
                                </div>

                                {/* Reason */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300 ml-1">
                                        Why do you want to be an organizer? *
                                    </label>
                                    <div className="relative group">
                                        <FiMessageSquare className="absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <textarea
                                            required name="reason" value={formData.reason} onChange={handleChange}
                                            placeholder="Tell us about your motivation, vision for events, and what you'd bring to the platform..."
                                            rows={5}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 text-white placeholder:text-slate-500 resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-xs text-slate-500 text-center mb-4">
                                        By submitting, you confirm that all information provided is accurate and you agree to our organizer guidelines.
                                    </p>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl text-sm border border-red-400/20 mb-4"
                                        >
                                            <FiAlertCircle className="shrink-0" />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}

                                    <button
                                        disabled={isSubmitting}
                                        type="submit"
                                        className="w-full relative group bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-blue-900/30 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                                    >
                                        <div className="relative z-10 flex items-center justify-center gap-2">
                                            {isSubmitting ? (
                                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Submit Application</span>
                                                    <FiSend className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/3 backdrop-blur-xl border border-green-500/20 p-14 rounded-3xl shadow-2xl text-center space-y-6"
                        >
                            <div className="flex justify-center">
                                <div className="h-24 w-24 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
                                    <FiCheckCircle className="text-5xl text-green-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">Application Submitted!</h2>
                                <p className="text-slate-400 max-w-sm mx-auto">
                                    Thank you, <span className="text-white font-medium">{formData.name}</span>! Our admin team will review your application and contact you at <span className="text-blue-400">{formData.email}</span> shortly.
                                </p>
                            </div>
                            <p className="text-xs text-slate-500 animate-pulse">Redirecting you to the home page...</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
