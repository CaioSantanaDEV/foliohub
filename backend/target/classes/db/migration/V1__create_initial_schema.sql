CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tb_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_user_email UNIQUE (email),
    CONSTRAINT chk_user_email_not_empty CHECK (LENGTH(TRIM(email)) > 0),
    CONSTRAINT chk_user_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_user_email ON tb_users (email);

CREATE TABLE tb_stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    operation_type VARCHAR(10) NOT NULL,
    quantity NUMERIC(19, 4) NOT NULL,
    unit_price NUMERIC(19, 4) NOT NULL,
    total_value NUMERIC(19, 2) NOT NULL,
    brokerage_fees NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    operation_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_transaction_user 
        FOREIGN KEY (user_id) REFERENCES tb_users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    CONSTRAINT chk_st_operation_type 
        CHECK (operation_type IN ('COMPRA', 'VENDA')),

    CONSTRAINT chk_st_quantity_positive 
        CHECK (quantity > 0),

    CONSTRAINT chk_st_unit_price_positive 
        CHECK (unit_price > 0),

    CONSTRAINT chk_st_total_value_positive 
        CHECK (total_value > 0),

    CONSTRAINT chk_st_brokerage_fees_non_negative 
        CHECK (brokerage_fees >= 0)
);

CREATE INDEX idx_st_user_id ON tb_stock_transactions (user_id);
CREATE INDEX idx_st_ticker ON tb_stock_transactions (ticker);
CREATE INDEX idx_st_user_ticker ON tb_stock_transactions (user_id, ticker);
CREATE INDEX idx_st_date ON tb_stock_transactions (operation_date DESC);

CREATE TABLE tb_fixed_income_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    asset_name VARCHAR(120) NOT NULL,
    issuer VARCHAR(100),
    type VARCHAR(20) NOT NULL,
    indexer VARCHAR(20) NOT NULL,
    contracted_rate NUMERIC(10, 4) NOT NULL,
    invested_amount NUMERIC(19, 2) NOT NULL,
    current_amount NUMERIC(19, 2) NOT NULL,
    investment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fixed_income_user 
        FOREIGN KEY (user_id) REFERENCES tb_users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    CONSTRAINT chk_fip_type 
        CHECK (type IN ('CDB', 'LCI', 'LCA', 'TESOURO', 'CRI', 'CRA', 'DEBENTURE')),

    CONSTRAINT chk_fip_indexer 
        CHECK (indexer IN ('CDI', 'PREFIXADO', 'IPCA', 'SELIC', 'IGPM')),

    CONSTRAINT chk_fip_rate_positive 
        CHECK (contracted_rate > 0),

    CONSTRAINT chk_fip_invested_positive 
        CHECK (invested_amount > 0),

    CONSTRAINT chk_fip_current_non_negative 
        CHECK (current_amount >= 0),

    CONSTRAINT chk_fip_due_after_investment 
        CHECK (due_date >= investment_date)
);

CREATE INDEX idx_fip_user_id ON tb_fixed_income_positions (user_id);
CREATE INDEX idx_fip_type ON tb_fixed_income_positions (type);
CREATE INDEX idx_fip_indexer ON tb_fixed_income_positions (indexer);
CREATE INDEX idx_fip_due_date ON tb_fixed_income_positions (due_date ASC);
CREATE INDEX idx_fip_user_active ON tb_fixed_income_positions (user_id, active);
