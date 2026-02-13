import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { checkLogin } from "../services/auth";

// Define handlers outside to keep references stable
const preventDefault = (e) => {
    e.preventDefault();
};

const preventDevToolsKeys = (e) => {
    if (
        e.key === "F12" ||
        (e.ctrlKey &&
            e.shiftKey &&
            (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "U")
    ) {
        e.preventDefault();
        e.stopPropagation();
    }
};

const enableRestrictions = () => {
    document.addEventListener("contextmenu", preventDefault);
    document.addEventListener("keydown", preventDevToolsKeys);
};

const disableRestrictions = () => {
    document.removeEventListener("contextmenu", preventDefault);
    document.removeEventListener("keydown", preventDevToolsKeys);
};

const DevToolsRestriction = () => {
    const location = useLocation();
    // We use a ref to track if listeners are currently active to avoid duplicates
    const isRestrictedRef = useRef(false);

    useEffect(() => {
        const enforceRestrictions = async () => {
            try {
                const { authenticated, user } = await checkLogin();

                // Roles to restrict
                const RESTRICTED_ROLES = ["user", "student"];

                if (
                    authenticated &&
                    user &&
                    user.role &&
                    RESTRICTED_ROLES.includes(user.role)
                ) {
                    if (!isRestrictedRef.current) {
                        enableRestrictions();
                        isRestrictedRef.current = true;
                    }
                } else {
                    // Only disable if we were previously restricted and now we are not
                    // (e.g. logout or role switch)
                    if (isRestrictedRef.current) {
                        disableRestrictions();
                        isRestrictedRef.current = false;
                    }
                }
            } catch (e) {
                console.error("Error checking auth for restrictions", e);
            }
        };

        enforceRestrictions();
    }, [location.pathname]);

    // Clean up only when the component unmounts (application close/refresh)
    useEffect(() => {
        return () => {
            if (isRestrictedRef.current) {
                disableRestrictions();
                isRestrictedRef.current = false;
            }
        };
    }, []);

    return null;
};

export default DevToolsRestriction;
