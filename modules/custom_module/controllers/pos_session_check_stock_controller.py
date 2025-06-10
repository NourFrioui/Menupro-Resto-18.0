from odoo import http
from odoo.http import request

class PosSessionCheckController(http.Controller):

    @http.route('/pos/check_session_stock', type='json', auth='user')
    def check_session_stock(self):
        user = request.env.user
        current_session = request.env['pos.session'].sudo().search([
            ('user_id', '=', user.id),
            ('state', '=', 'opened')
        ], limit=1)

        if not current_session:
            return {'errors': ['Aucune session POS ouverte trouvée pour l’utilisateur actuel.']}

        try:
            result = current_session.check_stock_availability()
            return result
        except Exception as e:
            return {'errors': [f"Erreur lors de la vérification du stock : {str(e)}"]}
