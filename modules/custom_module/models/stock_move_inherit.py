from odoo import api, fields, models


class StockMove(models.Model):
    _inherit = 'stock.move'

    cout_total = fields.Float(
        string='Coût Total',
        compute='_compute_cout_total',
        store=False,
        digits='Product Price'
    )

    @api.depends('product_id', 'product_uom_qty', 'quantity')
    def _compute_cout_total(self):
        for move in self:
            qty = move.quantity if move.state != 'draft' else move.product_uom_qty
            move.cout_total = move.product_id.standard_price* qty

    @api.onchange('product_id', 'product_uom_qty', 'quantity')
    def _onchange_quantity_cost(self):
        """Force le recalcul du coût total lors de la modification des quantités"""
        self._compute_cout_total()