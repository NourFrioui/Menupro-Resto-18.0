/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ClosePosPopup } from "@point_of_sale/app/navbar/closing_popup/closing_popup";
import { _t } from "@web/core/l10n/translation";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { ask } from "@point_of_sale/app/store/make_awaitable_dialog";
import { useService } from "@web/core/utils/hooks";





// 👇 Patch du composant
patch(ClosePosPopup.prototype, {
    setup() {
        const res = super.setup();
        console.log("res",res);
        this.pos = usePos();

        this.orm = useService("orm");
    },

     async checkStockAvailability() {
        try {
        const sessionIds = this.pos.config.session_ids;
        const sessionId = sessionIds?.[0]?.id;

        console.log("🆔 ID de la session POS :", sessionId);

            const response = await this.orm.call(
                "pos.session",
                "check_stock_availability",
                [sessionId]
            );
            return response;
        } catch (error) {
            return { success: false, errors: error };
        }
    },


    async confirm() {
        console.log("🔒 Patch: Fermeture de session personnalisée");

        const stockResult = await this.checkStockAvailability();
        console.log("stockResult", stockResult);

        if (stockResult.errors && stockResult.errors.length > 0) {
            const response = await ask(this.dialog, {
                title: _t("Avertissement de Stock"),
                body: _t(
                    "Les problèmes de stock suivants ont été détectés :\n\n" +
                    stockResult.errors.join("\n") +
                    "\n\nVoulez-vous continuer à fermer la session ?"
                ),
                confirmLabel: _t("Oui"),
                cancelLabel: _t("Annuler"),
            });

            if (response) {
                return await super.confirm();
            }
            return;
        }

         return await super.confirm();
    },
});
